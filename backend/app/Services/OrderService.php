<?php

namespace App\Services;

use App\Jobs\SendOrderPush;
use App\Models\Address;
use App\Models\DeliveryZone;
use App\Models\Order;
use App\Models\OrderEvent;
use App\Models\User;
use App\Support\Money;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use RuntimeException;

class OrderService
{
    public function __construct(private readonly PricingService $pricing) {}

    /**
     * Create an order.
     *
     * Everything that decides money is computed here and written from the
     * server's own numbers. The only things taken from the request are which
     * products, how many, where to deliver and when.
     */
    public function place(User $user, array $input, string $source = Order::SOURCE_APP): Order
    {
        $address = $user->addresses()->findOrFail($input['address_id']);

        return $this->write($user, $input, $source, [
            'contact_name' => $user->name,
            'contact_phone' => $user->phone,
            'address_line' => $address->line,
            'address_notes' => $address->notes,
            'address_map_link' => $address->map_link,
            'delivery_zone_id' => $address->delivery_zone_id,
        ], 'Placed by customer.');
    }

    /**
     * An order from the website, where there is no account: the name, phone
     * and address come with the order itself. Priced by exactly the same
     * code as an app order, and on the same list in the panel.
     */
    public function placeFromWebsite(array $input): Order
    {
        return $this->write(null, $input, Order::SOURCE_WEB, [
            'contact_name' => $input['contact_name'],
            'contact_phone' => $input['contact_phone'],
            'address_line' => $input['address_line'],
            'address_notes' => $input['address_notes'] ?? null,
            'address_map_link' => $input['map_link'] ?? null,
            'delivery_zone_id' => $input['zone_id'],
        ], 'Placed on the website.');
    }

    /**
     * Everything that decides money is computed here and written from the
     * server's own numbers. The only things taken from the request are which
     * products, how many, where to deliver and when.
     *
     * @param  array<string, mixed>  $contact  the name, phone and address snapshot
     */
    private function write(?User $user, array $input, string $source, array $contact, string $note): Order
    {
        // The fee and the minimum come from the zone. An address whose zone
        // has since been switched off would otherwise price at a fee of 0 for
        // an area the shop no longer serves.
        $zoneId = $contact['delivery_zone_id'];
        $zoneActive = $zoneId !== null
            && DeliveryZone::whereKey($zoneId)->where('is_active', true)->exists();

        if (! $zoneActive) {
            throw new OrderRejected('We no longer deliver to this area. Please update the address.');
        }

        $basket = $this->pricing->quote($input['lines'], $zoneId);

        $this->assertPlaceable($basket);

        return DB::transaction(function () use ($user, $basket, $input, $source, $contact, $note) {
            $order = new Order;

            $order->forceFill([
                'code' => $this->nextCode(),
                'user_id' => $user?->id,
                'status' => Order::PLACED,
                'source' => $source,
                'currency' => config('freshness.currency'),

                // Server-computed, every one of them.
                'subtotal_minor' => $basket->subtotalMinor,
                'delivery_fee_minor' => $basket->deliveryFeeMinor,
                'discount_minor' => $basket->discountMinor,
                'total_minor' => $basket->totalMinor,
                'requires_weighing' => $basket->requiresWeighing,

                // Snapshotted, so that editing a saved address next month does
                // not rewrite where last month's order went.
                ...$contact,

                'delivery_date' => $input['delivery_date'] ?? null,
                'delivery_slot' => $input['delivery_slot'] ?? null,
                'payment_method' => $input['payment_method'] ?? 'cash',
                'customer_note' => $input['note'] ?? null,

                'placed_at' => now(),
            ])->save();

            foreach ($basket->lines as $line) {
                // forceCreate, not create: OrderItem guards everything, so
                // that no other code path can mass-assign a price. Every value
                // here came from the catalogue a moment ago.
                $order->items()->forceCreate([
                    'product_id' => $line->product->id,
                    'name_snapshot' => $line->nameSnapshot(),
                    'unit_price_minor' => $line->unitPriceMinor,
                    'unit_kind' => $line->product->unit_kind,
                    'unit_qty' => $line->product->unit_qty,
                    'qty' => $line->qty,
                    'is_weight_based' => $line->isWeightBased,
                    'line_total_minor' => $line->lineTotalMinor,
                ]);
            }

            $this->record($order, null, Order::PLACED, $user, $note);

            return $order->load('items');
        });
    }

    private function assertPlaceable(PricedBasket $basket): void
    {
        // Unavailability is checked first. A basket whose every line has sold
        // out is also an empty basket, and "your basket is empty" is both
        // untrue and unactionable — the customer put things in it, and needs
        // to be told which ones went away.
        if ($basket->hasUnavailable()) {
            throw new OrderRejected(
                'Some items are no longer available.',
                ['unavailable_product_ids' => $basket->unavailableProductIds],
            );
        }

        if ($basket->isEmpty()) {
            throw new OrderRejected('Your basket is empty.');
        }

        if (! $basket->meetsMinimum()) {
            throw new OrderRejected(sprintf(
                'The minimum order for this area is %s.',
                Money::format($basket->minimumOrderMinor),
            ));
        }
    }

    /**
     * Move an order to a new status.
     *
     * The row is locked first and the current status re-read inside the lock,
     * so two couriers tapping at the same moment cannot both succeed. Checking
     * the status and then writing it — outside a lock — is the bug that lets
     * one order get delivered twice.
     */
    public function transition(Order $order, string $to, User $actor, ?string $note = null, bool $byCustomer = false): Order
    {
        return DB::transaction(function () use ($order, $to, $actor, $note, $byCustomer) {
            /** @var Order $fresh */
            $fresh = Order::whereKey($order->getKey())->lockForUpdate()->firstOrFail();

            // A customer's narrower rule is checked here, on the locked row:
            // checked before the lock, staff could move the order on in
            // between and the customer would cancel something already cut.
            if ($byCustomer && ! $fresh->isCancellableByCustomer()) {
                throw new OrderRejected('This order is already on its way. Please call us instead.');
            }

            if (! $fresh->canTransitionTo($to)) {
                throw new OrderRejected(
                    "An order that is {$fresh->status} cannot become {$to}."
                );
            }

            $from = $fresh->status;

            $stamps = match ($to) {
                Order::CONFIRMED => ['confirmed_at' => now()],
                Order::DELIVERED => ['delivered_at' => now()],
                Order::CANCELLED => [
                    'cancelled_at' => now(),
                    'cancelled_by' => $actor->role,
                    'cancel_reason' => $note,
                ],
                default => [],
            };

            $fresh->forceFill(['status' => $to] + $stamps)->save();

            $this->record($fresh, $from, $to, $actor, $note);

            // Dispatched after the transaction commits, never inside it. A job
            // queued mid-transaction can be picked up by a worker before the
            // commit lands — and then reads a row that does not exist yet, or
            // one that a rollback is about to undo.
            DB::afterCommit(fn () => SendOrderPush::dispatch($fresh->id, $to));

            return $fresh;
        });
    }

    /**
     * Record the weights the courier actually put on the scales.
     *
     * Most of this catalogue is sold by the kilo, so the total agreed at
     * checkout is an estimate. This is where it becomes the real bill: each
     * weighed line is re-priced from the confirmed weight, fixed-unit lines
     * are left exactly as sold, and the delivery fee and any discount carry
     * over untouched.
     *
     * The unit price is taken from the order line, not from today's catalogue —
     * a price rise between ordering and delivery must not reach a customer who
     * already agreed a number.
     *
     * @param  array<string, float>  $confirmed  order item id => weight
     */
    public function confirmWeights(Order $order, array $confirmed, User $actor): Order
    {
        return DB::transaction(function () use ($order, $confirmed, $actor) {
            /** @var Order $fresh */
            $fresh = Order::whereKey($order->getKey())->lockForUpdate()->firstOrFail();

            if (! $fresh->requires_weighing) {
                throw new OrderRejected('Nothing on this order is sold by weight.');
            }

            if (in_array($fresh->status, [Order::DELIVERED, Order::CANCELLED], true)) {
                throw new OrderRejected('This order is already closed.');
            }

            $subtotal = 0;
            $weighedEstimate = 0;
            $weighedFinal = 0;

            foreach ($fresh->items as $item) {
                if (! $item->is_weight_based) {
                    // Sold as a unit; the confirmed total is what was agreed.
                    $item->forceFill([
                        'confirmed_qty' => $item->qty,
                        'final_line_total_minor' => $item->line_total_minor,
                    ])->save();

                    $subtotal += $item->line_total_minor;

                    continue;
                }

                $qty = (float) ($confirmed[(string) $item->id] ?? $item->qty);

                if ($qty <= 0) {
                    throw new OrderRejected("A confirmed weight must be greater than zero (line {$item->id}).");
                }

                $lineTotal = Money::line($item->unit_price_minor, $qty);

                $item->forceFill([
                    'confirmed_qty' => $qty,
                    'final_line_total_minor' => $lineTotal,
                ])->save();

                $subtotal += $lineTotal;
                $weighedEstimate += $item->line_total_minor;
                $weighedFinal += $lineTotal;
            }

            // The customer agreed to "at most" the estimate plus the weight
            // tolerance (PricedBasket::weighedCeilingMinor). Going past that
            // is a conversation with the customer, not a number staff can set.
            $tolerance = (int) config('freshness.order.weight_tolerance_percent');
            $ceiling = $weighedEstimate + (int) ceil($weighedEstimate * $tolerance / 100);

            if ($weighedFinal > $ceiling) {
                throw new OrderRejected(sprintf(
                    'The weighed goods come to %s, more than the %s the customer agreed to. Ask the customer first, or weigh again.',
                    Money::format($weighedFinal),
                    Money::format($ceiling),
                ));
            }

            $finalTotal = $subtotal + $fresh->delivery_fee_minor - $fresh->discount_minor;

            $fresh->forceFill([
                'final_subtotal_minor' => $subtotal,
                'final_total_minor' => max(0, $finalTotal),
                'weighed_at' => now(),
                'weighed_by' => $actor->id,
            ])->save();

            $this->record($fresh, $fresh->status, $fresh->status, $actor, sprintf(
                'Weighed: estimate %s, confirmed %s.',
                Money::format($fresh->total_minor),
                Money::format($fresh->final_total_minor),
            ));

            // The notification that earns the feature: the customer agreed to
            // an estimate and this is the real figure, reaching them before
            // somebody knocks expecting payment.
            DB::afterCommit(fn () => SendOrderPush::dispatch($fresh->id, 'weighed'));

            return $fresh->load('items');
        });
    }

    private function record(Order $order, ?string $from, string $to, ?User $actor, ?string $note): void
    {
        OrderEvent::create([
            'order_id' => $order->id,
            'from_status' => $from,
            'to_status' => $to,
            'actor_id' => $actor?->id,
            'actor_role' => $actor?->role,
            'note' => $note,
        ]);
    }

    /**
     * A short code a customer can read down the phone.
     *
     * Not sequential: a guessable order number tells a competitor exactly how
     * many orders the shop takes, and invites people to try their neighbour's.
     * Ambiguous characters are left out so nobody has to ask "is that a one or
     * an I".
     */
    private function nextCode(): string
    {
        $alphabet = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';

        for ($try = 0; $try < 10; $try++) {
            $code = 'FR-';
            for ($i = 0; $i < 6; $i++) {
                $code .= $alphabet[random_int(0, strlen($alphabet) - 1)];
            }

            if (! Order::where('code', $code)->exists()) {
                return $code;
            }
        }

        throw new RuntimeException('Could not allocate an order code.');
    }
}
