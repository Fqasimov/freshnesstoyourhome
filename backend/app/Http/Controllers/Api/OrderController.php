<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreOrderRequest;
use App\Http\Resources\OrderResource;
use App\Models\Order;
use App\Services\OrderRejected;
use App\Services\OrderService;
use App\Services\PricingService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Validation\Rule;

class OrderController extends Controller
{
    public function __construct(
        private readonly OrderService $orders,
        private readonly PricingService $pricing,
    ) {}

    public function index(Request $request): AnonymousResourceCollection
    {
        $orders = $request->user()->orders()
            ->with('items')
            ->latest('created_at')
            ->paginate(20);

        return OrderResource::collection($orders);
    }

    /**
     * Scoped through the relation, so another customer's order id is a 404
     * rather than a 403 — which would confirm that the order exists.
     */
    public function show(Request $request, string $id): OrderResource
    {
        $order = $request->user()->orders()->with('items')->findOrFail($id);

        return new OrderResource($order);
    }

    /**
     * Price a basket without committing to it.
     *
     * The basket screen calls this rather than doing the arithmetic itself, so
     * the number the customer sees is the number the server will charge. A
     * client that totals its own basket will eventually disagree with the
     * server, and the customer will be right to be annoyed about it.
     */
    public function quote(Request $request): JsonResponse
    {
        $data = $request->validate([
            'lines' => ['required_without:bundles', 'array', 'max:'.config('freshness.order.max_lines')],
            'lines.*.product_id' => ['required', 'string', 'max:60'],
            'lines.*.qty' => ['required', 'numeric', 'min:0.001', 'max:'.config('freshness.order.max_qty_per_line')],
            ...self::bundleRules(),
            'zone_id' => ['sometimes', 'nullable', 'string', 'max:40'],
            'locale' => ['sometimes', Rule::in(['az', 'ru', 'en'])],
        ]);

        $basket = $this->pricing->quote($data['lines'] ?? [], $data['zone_id'] ?? null, $data['bundles'] ?? []);

        // The language comes from the request, not from the account. This
        // endpoint is public, so there may be no account at all — and a
        // customer who has just switched language expects their basket to
        // follow immediately, before that choice is saved to a profile.
        $locale = $data['locale'] ?? $request->user()?->locale ?? 'az';

        return response()->json($basket->toArray($locale));
    }

    public function store(StoreOrderRequest $request): JsonResponse
    {
        // The app says which phone it is on. A client that says nothing, or
        // something else, is filed as a plain app order — the header only
        // labels the order for the panel and grants nothing.
        $source = match (strtolower((string) $request->header('X-Client'))) {
            'ios' => Order::SOURCE_IOS,
            'android' => Order::SOURCE_ANDROID,
            default => Order::SOURCE_APP,
        };

        $order = $this->orders->place($request->user(), $request->validated(), $source);

        return response()->json(new OrderResource($order), 201);
    }

    /**
     * An order from the website, where there is no account.
     *
     * The customer gives a name, a phone and an address with the order, the
     * server prices it exactly as it prices an app order, and it lands in the
     * panel beside them. The website still opens WhatsApp afterwards, with the
     * order's code in the message, because that is where the shop confirms the
     * weights and the delivery time.
     */
    public function storeFromWebsite(Request $request): JsonResponse
    {
        $lead = (int) config('freshness.order.lead_days');
        $maxAhead = (int) config('freshness.order.max_days_ahead');

        $data = $request->validate([
            'lines' => ['required_without:bundles', 'array', 'max:'.config('freshness.order.max_lines')],
            'lines.*.product_id' => ['required', 'string', 'max:60', 'distinct', Rule::exists('products', 'id')],
            'lines.*.qty' => ['required', 'numeric', 'min:0.001', 'max:'.config('freshness.order.max_qty_per_line')],
            ...self::bundleRules(),

            'zone_id' => ['required', 'string', Rule::exists('delivery_zones', 'id')->where('is_active', true)],
            'contact_name' => ['required', 'string', 'min:2', 'max:80'],
            // Digits, spaces, dashes, brackets and an optional leading +.
            'contact_phone' => ['required', 'string', 'regex:/^\+?[0-9 ()-]{7,20}$/'],
            'address_line' => ['required', 'string', 'min:5', 'max:300'],
            'address_notes' => ['sometimes', 'nullable', 'string', 'max:200'],
            'map_link' => [
                'sometimes', 'nullable', 'string', 'max:500',
                'regex:#^https://(maps\.app\.goo\.gl/|goo\.gl/maps|(www\.|maps\.)?google\.(com|az)/)#i',
            ],
            'delivery_date' => [
                'sometimes', 'nullable', 'date_format:Y-m-d',
                'after_or_equal:'.now()->addDays($lead)->toDateString(),
                'before_or_equal:'.now()->addDays($maxAhead)->toDateString(),
            ],
            'note' => ['sometimes', 'nullable', 'string', 'max:500'],
        ]);

        // Whole units only for things sold by the piece, as in the app.
        $data['lines'] ??= [];
        $kinds = \App\Models\Product::whereIn('id', array_column($data['lines'], 'product_id'))->pluck('unit_kind', 'id');
        foreach ($data['lines'] as $i => $line) {
            $qty = (float) $line['qty'];
            if (($kinds[$line['product_id']] ?? null) !== \App\Models\Product::UNIT_KG && floor($qty) !== $qty) {
                throw \Illuminate\Validation\ValidationException::withMessages(["lines.{$i}.qty" => 'This item is sold in whole units.']);
            }
        }

        $order = $this->orders->placeFromWebsite($data);

        return response()->json([
            'id' => $order->id,
            'code' => $order->code,
            'total_minor' => $order->total_minor,
            'delivery_fee_minor' => $order->delivery_fee_minor,
            'requires_weighing' => $order->requires_weighing,
        ], 201);
    }

    /**
     * Cancel, as the customer.
     *
     * Only up to the point the order leaves the building — after that the
     * goods have been cut and weighed for this customer specifically, and
     * calling it off is a conversation with the shop, not a button.
     */
    public function cancel(Request $request, string $id): JsonResponse
    {
        $order = $request->user()->orders()->findOrFail($id);

        if (! $order->isCancellableByCustomer()) {
            throw new OrderRejected('This order is already on its way. Please call us instead.');
        }

        $reason = $request->validate([
            'reason' => ['sometimes', 'nullable', 'string', 'max:200'],
        ])['reason'] ?? null;

        $order = $this->orders->transition($order, Order::CANCELLED, $request->user(), $reason, byCustomer: true);

        return response()->json(new OrderResource($order->load('items')));
    }

    /**
     * Sets in a basket: which one and how many, nothing else. What is in a
     * set and what it costs are the panel's, read when the basket is priced.
     */
    public static function bundleRules(): array
    {
        return [
            'bundles' => ['required_without:lines', 'array', 'max:10'],
            'bundles.*.bundle_id' => ['required', 'string', 'max:60', 'distinct'],
            'bundles.*.qty' => ['required', 'integer', 'min:1', 'max:20'],
        ];
    }
}
