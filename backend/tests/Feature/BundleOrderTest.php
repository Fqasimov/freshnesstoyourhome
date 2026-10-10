<?php

namespace Tests\Feature;

use App\Models\Bundle;
use App\Models\Order;
use App\Models\Product;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * A set bought from the website or the app costs what the panel says: its
 * products at their own prices, less the panel's percentage — priced here,
 * so the customer, the WhatsApp message and the panel all see one figure.
 */
class BundleOrderTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seedCatalogue();

        $set = Bundle::create(['id' => 'fish-night', 'discount_percent' => 10, 'is_active' => true, 'sort' => 1]);
        $set->translations()->create(['locale' => 'az', 'name' => 'Balıq gecəsi']);
        $set->items()->create(['product_id' => 'smoked-dorado', 'qty' => 1]);   // 15.00
        $set->items()->create(['product_id' => 'smoked-trout', 'qty' => 2]);    // 2 × 9.00
    }

    public function test_a_set_is_quoted_at_the_panels_discount(): void
    {
        $quote = $this->postJson('/api/orders/quote', [
            'bundles' => [['bundle_id' => 'fish-night', 'qty' => 2]],
            'zone_id' => self::ZONE,
        ])->assertOk();

        // Two sets: 2 × (15 + 18) = 66.00, less 10% = 59.40, plus delivery.
        $quote->assertJsonPath('subtotal_minor', 6600)
            ->assertJsonPath('discount_minor', 660)
            ->assertJsonPath('bundles.0.price_minor', 5940)
            ->assertJsonPath('total_minor', 5940 + $quote->json('delivery_fee_minor'))
            ->assertJsonPath('lines.0.bundle_id', 'fish-night');
    }

    public function test_sets_and_single_products_price_together(): void
    {
        $this->postJson('/api/orders/quote', [
            'lines' => [['product_id' => 'smoked-trout', 'qty' => 1]],
            'bundles' => [['bundle_id' => 'fish-night', 'qty' => 1]],
        ])->assertOk()
            ->assertJsonPath('subtotal_minor', 900 + 3300)
            ->assertJsonPath('discount_minor', 330)
            ->assertJsonPath('total_minor', 900 + 2970);
    }

    public function test_the_discount_comes_from_the_panel_not_the_request(): void
    {
        $this->postJson('/api/orders/quote', [
            'bundles' => [['bundle_id' => 'fish-night', 'qty' => 1, 'discount_percent' => 90, 'price_minor' => 1]],
        ])->assertOk()->assertJsonPath('discount_minor', 330);
    }

    public function test_a_set_with_something_out_of_stock_cannot_be_ordered(): void
    {
        Product::whereKey('smoked-trout')->update(['in_stock' => false]);

        $this->postJson('/api/orders/quote', ['bundles' => [['bundle_id' => 'fish-night', 'qty' => 1]]])
            ->assertOk()
            ->assertJsonPath('unavailable_bundle_ids', ['fish-night'])
            ->assertJsonPath('discount_minor', 0);

        $this->postJson('/api/orders/web', $this->webOrder())->assertStatus(422);
    }

    public function test_a_switched_off_set_cannot_be_ordered(): void
    {
        Bundle::whereKey('fish-night')->update(['is_active' => false]);

        $this->postJson('/api/orders/web', $this->webOrder())->assertStatus(422);
        $this->assertSame(0, Order::count());
    }

    public function test_a_website_order_with_a_set_lands_in_the_panel_with_its_discount(): void
    {
        $this->postJson('/api/orders/web', $this->webOrder())->assertCreated();

        $order = Order::with('items')->sole();
        $this->assertSame(3300, $order->subtotal_minor);
        $this->assertSame(330, $order->discount_minor);
        $this->assertSame(2970 + $order->delivery_fee_minor, $order->total_minor);
        $this->assertEqualsCanonicalizing(['smoked-dorado', 'smoked-trout'], $order->items->pluck('product_id')->all());
    }

    public function test_an_app_order_with_a_set_carries_the_discount(): void
    {
        [$user, $address] = $this->customerWithAddress();
        $this->signInAs($user);

        $this->postJson('/api/orders', [
            'address_id' => $address->id,
            'bundles' => [['bundle_id' => 'fish-night', 'qty' => 1]],
            'delivery_date' => $this->deliverableDate(),
        ])->assertCreated()->assertJsonPath('discount_minor', 330);
    }

    private function webOrder(): array
    {
        return [
            'bundles' => [['bundle_id' => 'fish-night', 'qty' => 1]],
            'zone_id' => self::ZONE,
            'contact_name' => 'Aysel', 'contact_phone' => '+994 50 123 45 67', 'address_line' => 'Nizami küçəsi 10',
        ];
    }
}
