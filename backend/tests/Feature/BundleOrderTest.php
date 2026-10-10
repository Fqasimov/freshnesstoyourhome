<?php

namespace Tests\Feature;

use App\Models\Bundle;
use App\Models\Order;
use App\Models\Product;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * A set bought from the website or the app costs what the panel says: each of
 * its products at the panel's percentage off — priced here, so the customer,
 * the WhatsApp message and the panel all see one figure.
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
        // Two sets: each unit 10% off — dorado 13.50, trout 8.10 — so
        // 2 × (13.50 + 2 × 8.10) = 59.40, plus delivery.
        $quote = $this->postJson('/api/orders/quote', [
            'bundles' => [['id' => 'fish-night', 'qty' => 2]],
            'zone_id' => self::ZONE,
        ])->assertOk();

        $quote->assertJsonPath('subtotal_minor', 5940)
            ->assertJsonPath('total_minor', 5940 + $quote->json('delivery_fee_minor'))
            ->assertJsonPath('lines.0.bundle_id', 'fish-night')
            ->assertJsonPath('lines.0.unit_price_minor', 1350);
    }

    public function test_sets_and_single_products_price_together(): void
    {
        $this->postJson('/api/orders/quote', [
            'lines' => [['product_id' => 'smoked-trout', 'qty' => 1]],
            'bundles' => [['id' => 'fish-night', 'qty' => 1]],
        ])->assertOk()
            ->assertJsonPath('subtotal_minor', 900 + 2970)
            ->assertJsonPath('lines.0.bundle_id', null);
    }

    public function test_the_discount_comes_from_the_panel_not_the_request(): void
    {
        $this->postJson('/api/orders/quote', [
            'bundles' => [['id' => 'fish-night', 'qty' => 1, 'discount_percent' => 90, 'price_minor' => 1]],
        ])->assertOk()->assertJsonPath('subtotal_minor', 2970);
    }

    public function test_a_set_with_something_out_of_stock_cannot_be_ordered(): void
    {
        Product::whereKey('smoked-trout')->update(['in_stock' => false]);

        $this->postJson('/api/orders/quote', ['bundles' => [['id' => 'fish-night', 'qty' => 1]]])
            ->assertOk()
            ->assertJsonPath('unavailable_product_ids', ['smoked-trout']);

        $this->postJson('/api/orders/web', $this->webOrder())->assertStatus(422);
    }

    public function test_a_switched_off_set_cannot_be_ordered(): void
    {
        Bundle::whereKey('fish-night')->update(['is_active' => false]);

        $this->postJson('/api/orders/web', $this->webOrder())->assertStatus(422);
        $this->assertSame(0, Order::count());
    }

    public function test_a_website_order_with_a_set_lands_in_the_panel_at_the_set_price(): void
    {
        $this->postJson('/api/orders/web', $this->webOrder())->assertCreated();

        $order = Order::with('items')->sole();
        $this->assertSame(2970, $order->subtotal_minor);
        $this->assertEqualsCanonicalizing(['smoked-dorado', 'smoked-trout'], $order->items->pluck('product_id')->all());
    }

    public function test_an_app_order_can_carry_a_set(): void
    {
        [$user, $address] = $this->customerWithAddress();
        $this->signInAs($user);

        $this->postJson('/api/orders', [
            'address_id' => $address->id,
            'bundles' => [['id' => 'fish-night', 'qty' => 1]],
            'delivery_date' => $this->deliverableDate(),
        ])->assertCreated()->assertJsonPath('subtotal_minor', 2970);
    }

    private function webOrder(): array
    {
        return [
            'bundles' => [['id' => 'fish-night', 'qty' => 1]],
            'zone_id' => self::ZONE,
            'contact_name' => 'Aysel Məmmədova', 'contact_phone' => '+994 50 123 45 67', 'address_line' => 'Nizami küçəsi 10',
        ];
    }
}
