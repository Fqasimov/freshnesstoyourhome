<?php

namespace Tests\Feature;

use App\Models\Order;
use App\Models\Product;
use App\Models\User;
use App\Support\Money;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/**
 * Goods sold by the kilo.
 *
 * Most of this catalogue is weighed, and a kilo of salmon is never exactly a
 * kilo. The order carries an estimate; the courier's scales produce the bill.
 * Getting this wrong means arguing with customers at the door.
 */
class WeighedOrderTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seedCatalogue();
    }

    private function placeOrder(array $lines): Order
    {
        [$user, $address] = $this->customerWithAddress();
        Sanctum::actingAs($user);

        $this->postJson('/api/orders', $this->orderPayload($address, $lines))->assertCreated();

        return Order::with('items')->first();
    }

    public function test_a_basket_with_a_weighed_line_is_flagged_for_weighing(): void
    {
        $order = $this->placeOrder(['smoked-salmon' => 1]);

        $this->assertTrue($order->requires_weighing);
        $this->assertNull($order->final_total_minor);
    }

    public function test_a_basket_of_fixed_units_only_is_not_flagged(): void
    {
        $piece = Product::where('unit_kind', '!=', 'kg')->firstOrFail();

        $order = $this->placeOrder([$piece->id => 2]);

        $this->assertFalse($order->requires_weighing);
    }

    public function test_the_customer_is_shown_a_ceiling_as_well_as_an_estimate(): void
    {
        [$user, $address] = $this->customerWithAddress();
        Sanctum::actingAs($user);

        $quote = $this->postJson('/api/orders/quote', [
            'lines' => [['product_id' => 'smoked-salmon', 'qty' => 1]],
            'zone_id' => self::ZONE,
        ])->assertOk()->json();

        $tolerance = (int) config('freshness.order.weight_tolerance_percent');

        $this->assertTrue($quote['requires_weighing']);
        $this->assertGreaterThan($quote['total_minor'], $quote['weighed_ceiling_minor']);
        // The tolerance applies to the GOODS, not to the delivery fee: a
        // heavier fish costs more, the drive does not. This read as
        // total * tolerance only while the seeded zones charged nothing.
        $this->assertSame(
            $quote['total_minor'] + (int) ceil($quote['subtotal_minor'] * $tolerance / 100),
            $quote['weighed_ceiling_minor'],
        );
    }

    public function test_the_final_bill_is_repriced_from_the_confirmed_weight(): void
    {
        $order = $this->placeOrder(['smoked-salmon' => 1]);
        $item = $order->items->first();
        $unit = $item->unit_price_minor;

        $courier = User::factory()->courier()->create();
        Sanctum::actingAs($courier->fresh());

        // The scales said 1.180 kg, not the 1.000 kg estimated.
        $this->postJson("/api/staff/orders/{$order->id}/weights", [
            'weights' => [(string) $item->id => 1.18],
        ])->assertOk();

        $order->refresh();

        $this->assertSame(Money::line($unit, 1.18), $order->final_subtotal_minor);
        $this->assertSame(
            $order->final_subtotal_minor + $order->delivery_fee_minor - $order->discount_minor,
            $order->final_total_minor,
        );
        $this->assertSame(1.18, $order->items->first()->confirmed_qty);
        $this->assertNotNull($order->weighed_at);
    }

    public function test_a_price_rise_between_ordering_and_weighing_does_not_reach_the_customer(): void
    {
        $order = $this->placeOrder(['smoked-salmon' => 1]);
        $item = $order->items->first();
        $agreedUnitPrice = $item->unit_price_minor;

        // The shop puts salmon up overnight.
        Product::find('smoked-salmon')->update(['price_minor' => 99_000]);

        $courier = User::factory()->courier()->create();
        Sanctum::actingAs($courier->fresh());

        $this->postJson("/api/staff/orders/{$order->id}/weights", [
            'weights' => [(string) $item->id => 1.0],
        ])->assertOk();

        // Billed at the price the customer agreed to, not today's.
        $this->assertSame($agreedUnitPrice, $order->fresh()->final_subtotal_minor);
    }

    public function test_fixed_unit_lines_are_carried_over_untouched(): void
    {
        $piece = Product::where('unit_kind', '!=', 'kg')->firstOrFail();
        $order = $this->placeOrder(['smoked-salmon' => 1, $piece->id => 2]);

        $salmonItem = $order->items->firstWhere('product_id', 'smoked-salmon');
        $pieceItem = $order->items->firstWhere('product_id', $piece->id);

        $courier = User::factory()->courier()->create();
        Sanctum::actingAs($courier->fresh());

        // The courier reports only the weighed line.
        $this->postJson("/api/staff/orders/{$order->id}/weights", [
            'weights' => [(string) $salmonItem->id => 0.9],
        ])->assertOk();

        $pieceItem->refresh();

        $this->assertSame($pieceItem->line_total_minor, $pieceItem->final_line_total_minor);
        $this->assertSame($pieceItem->qty, $pieceItem->confirmed_qty);
    }

    public function test_a_customer_cannot_set_their_own_weights(): void
    {
        $order = $this->placeOrder(['smoked-salmon' => 1]);
        $item = $order->items->first();

        // Still acting as the customer who placed it.
        $this->postJson("/api/staff/orders/{$order->id}/weights", [
            'weights' => [(string) $item->id => 0.001],
        ])->assertStatus(404);

        $this->assertNull($order->fresh()->final_total_minor);
    }

    public function test_a_zero_or_negative_weight_is_refused(): void
    {
        $order = $this->placeOrder(['smoked-salmon' => 1]);
        $item = $order->items->first();

        $courier = User::factory()->courier()->create();
        Sanctum::actingAs($courier->fresh());

        $this->postJson("/api/staff/orders/{$order->id}/weights", [
            'weights' => [(string) $item->id => 0],
        ])->assertStatus(422);

        $this->postJson("/api/staff/orders/{$order->id}/weights", [
            'weights' => [(string) $item->id => -5],
        ])->assertStatus(422);
    }

    public function test_a_delivered_order_cannot_be_reweighed(): void
    {
        $order = $this->placeOrder(['smoked-salmon' => 1]);
        $item = $order->items->first();

        $courier = User::factory()->courier()->create();
        Sanctum::actingAs($courier->fresh());

        foreach (['confirmed', 'preparing', 'out_for_delivery', 'delivered'] as $status) {
            $this->postJson("/api/staff/orders/{$order->id}/transition", ['status' => $status])->assertOk();
        }

        $this->postJson("/api/staff/orders/{$order->id}/weights", [
            'weights' => [(string) $item->id => 5.0],
        ])->assertStatus(422);
    }
}
