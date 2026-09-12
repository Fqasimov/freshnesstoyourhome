<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\OrderResource;
use App\Models\Order;
use App\Models\User;
use App\Services\OrderService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Validation\Rule;

/**
 * The shop's own view: the day's orders, and the two things staff do to them —
 * move them along, and record what the scales said.
 */
class StaffOrderController extends Controller
{
    public function __construct(private readonly OrderService $orders) {}

    public function index(Request $request): AnonymousResourceCollection
    {
        $filters = $request->validate([
            'date' => ['sometimes', 'date_format:Y-m-d'],
            'status' => ['sometimes', Rule::in(array_keys(Order::TRANSITIONS))],
        ]);

        $orders = Order::query()
            ->with('items')
            ->when($filters['date'] ?? null, fn ($q, $date) => $q->whereDate('delivery_date', $date))
            ->when($filters['status'] ?? null, fn ($q, $status) => $q->where('status', $status))
            ->orderBy('delivery_date')
            ->orderBy('created_at')
            ->paginate(50);

        return OrderResource::collection($orders);
    }

    public function transition(Request $request, string $id): JsonResponse
    {
        $data = $request->validate([
            'status' => ['required', Rule::in(array_keys(Order::TRANSITIONS))],
            'note' => ['sometimes', 'nullable', 'string', 'max:200'],
        ]);

        $order = Order::findOrFail($id);

        $order = $this->orders->transition(
            $order,
            $data['status'],
            $request->user(),
            $data['note'] ?? null,
        );

        return response()->json(new OrderResource($order->load('items')));
    }

    /**
     * Record the weights.
     *
     * The courier weighs each line and sends back what the scales said; the
     * server re-prices from the unit price already on the order. The client
     * sends weights, never money.
     */
    public function confirmWeights(Request $request, string $id): JsonResponse
    {
        $data = $request->validate([
            'weights' => ['required', 'array', 'min:1'],
            'weights.*' => ['required', 'numeric', 'min:0.001', 'max:999'],
        ]);

        $order = Order::with('items')->findOrFail($id);

        $order = $this->orders->confirmWeights(
            $order,
            $data['weights'],
            $request->user(),
        );

        return response()->json(new OrderResource($order));
    }
}
