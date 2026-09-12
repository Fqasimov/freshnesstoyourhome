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
            'lines' => ['required', 'array', 'min:1', 'max:'.config('freshness.order.max_lines')],
            'lines.*.product_id' => ['required', 'string', 'max:60'],
            'lines.*.qty' => ['required', 'numeric', 'min:0.001', 'max:'.config('freshness.order.max_qty_per_line')],
            'zone_id' => ['sometimes', 'nullable', 'string', 'max:40'],
            'locale' => ['sometimes', Rule::in(['az', 'ru', 'en'])],
        ]);

        $basket = $this->pricing->quote($data['lines'], $data['zone_id'] ?? null);

        // The language comes from the request, not from the account. This
        // endpoint is public, so there may be no account at all — and a
        // customer who has just switched language expects their basket to
        // follow immediately, before that choice is saved to a profile.
        $locale = $data['locale'] ?? $request->user()?->locale ?? 'az';

        return response()->json($basket->toArray($locale));
    }

    public function store(StoreOrderRequest $request): JsonResponse
    {
        $order = $this->orders->place($request->user(), $request->validated());

        return response()->json(new OrderResource($order), 201);
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

        $order = $this->orders->transition($order, Order::CANCELLED, $request->user(), $reason);

        return response()->json(new OrderResource($order->load('items')));
    }
}
