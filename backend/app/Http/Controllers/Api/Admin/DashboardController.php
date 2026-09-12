<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\AdminAudit;
use App\Models\Bundle;
use App\Models\Order;
use App\Models\Product;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Carbon;

/**
 * The one screen somebody opens at nine in the morning.
 *
 * Everything here answers a question the shop has today: what is coming, what
 * is stuck, what has been sold, and what is about to embarrass us — a bundle
 * switched on whose products are out of stock, or an order that was delivered
 * without anybody recording the weights.
 */
class DashboardController extends Controller
{
    public function index(): JsonResponse
    {
        $today = Carbon::today();

        $byStatus = Order::query()
            ->selectRaw('status, count(*) as total')
            ->groupBy('status')
            ->pluck('total', 'status');

        // Only delivered orders count as money. An order that is placed is a
        // hope; one that is out for delivery is a hope in a van.
        $revenue = fn (Carbon $from) => (int) Order::query()
            ->where('status', Order::DELIVERED)
            ->where('delivered_at', '>=', $from)
            ->get()
            ->sum(fn (Order $o) => $o->payableMinor());

        $openStatuses = [Order::PLACED, Order::CONFIRMED, Order::PREPARING, Order::OUT_FOR_DELIVERY];

        return response()->json([
            'orders' => [
                'by_status' => collect(array_keys(Order::TRANSITIONS))
                    ->mapWithKeys(fn (string $s) => [$s => (int) ($byStatus[$s] ?? 0)]),
                'open' => Order::whereIn('status', $openStatuses)->count(),
                'today' => Order::whereDate('delivery_date', $today)->count(),
                'tomorrow' => Order::whereDate('delivery_date', $today->copy()->addDay())->count(),
                'new_today' => Order::whereDate('placed_at', $today)->count(),
                // Weight-based lines the courier has not confirmed yet: until
                // these are recorded the shop does not know what it is owed.
                'awaiting_weights' => Order::where('requires_weighing', true)
                    ->whereNull('weighed_at')
                    ->whereIn('status', $openStatuses)
                    ->count(),
            ],
            'revenue' => [
                'currency' => config('freshness.currency'),
                'today_minor' => $revenue($today),
                'week_minor' => $revenue($today->copy()->subDays(6)),
                'month_minor' => $revenue($today->copy()->startOfMonth()),
            ],
            'catalogue' => [
                'products' => Product::count(),
                'out_of_stock' => Product::where('in_stock', false)->count(),
                'inactive' => Product::where('is_active', false)->count(),
                'bundles_active' => Bundle::where('is_active', true)->count(),
                'bundles_total' => Bundle::count(),
            ],
            'customers' => [
                'total' => User::where('role', User::ROLE_CUSTOMER)->count(),
                'blocked' => User::whereNotNull('blocked_at')->count(),
            ],
            'recent_changes' => AdminAudit::with('actor')
                ->latest('created_at')
                ->limit(10)
                ->get()
                ->map(fn (AdminAudit $a) => [
                    'id' => $a->id,
                    'action' => $a->action,
                    'subject_type' => $a->subject_type,
                    'subject_id' => $a->subject_id,
                    'changes' => $a->changes,
                    'actor_role' => $a->actor_role,
                    'created_at' => $a->created_at,
                ]),
        ]);
    }
}
