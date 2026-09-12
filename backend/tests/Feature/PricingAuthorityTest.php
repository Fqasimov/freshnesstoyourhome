<?php

namespace Tests\Feature;

use App\Models\Order;
use App\Models\Product;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/**
 * The single most important property of this API: the client does not decide
 * what anything costs.
 *
 * Every app bundle is on a customer's own phone and can be modified. If any of
 * these tests fail, a modified client can buy the shop for nothing.
 */
class PricingAuthorityTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seedCatalogue();
    }

    public function test_prices_sent_by_the_client_are_ignored(): void
    {
        [$user, $address] = $this->customerWithAddress();
        Sanctum::actingAs($user);

        $payload = $this->orderPayload($address, ['smoked-salmon' => 1]);

        // Everything a hostile client might try to smuggle in.
        $payload['lines'][0] += [
            'price' => 1,
            'price_minor' => 1,
            'unit_price_minor' => 1,
            'line_total_minor' => 1,
        ];
        $payload += [
            'subtotal_minor' => 1,
            'total_minor' => 1,
            'discount_minor' => 999_999,
            'delivery_fee_minor' => 0,
        ];

        $response = $this->postJson('/api/orders', $payload);

        $response->assertCreated();

        $order = Order::first();
        $salmon = Product::find('smoked-salmon');

        $this->assertSame($salmon->price_minor, $order->subtotal_minor);
        $this->assertSame($salmon->price_minor, $order->total_minor);
        $this->assertSame(0, $order->discount_minor);
        $this->assertSame($salmon->price_minor, $order->items->first()->unit_price_minor);
    }

    public function test_an_inactive_product_cannot_be_ordered(): void
    {
        [$user, $address] = $this->customerWithAddress();
        Sanctum::actingAs($user);

        Product::find('smoked-salmon')->update(['is_active' => false]);

        $this->postJson('/api/orders', $this->orderPayload($address, ['smoked-salmon' => 1]))
            ->assertStatus(422)
            ->assertJsonPath('unavailable_product_ids.0', 'smoked-salmon');

        $this->assertSame(0, Order::count());
    }

    public function test_an_out_of_stock_product_cannot_be_ordered(): void
    {
        [$user, $address] = $this->customerWithAddress();
        Sanctum::actingAs($user);

        Product::find('smoked-salmon')->update(['in_stock' => false]);

        $this->postJson('/api/orders', $this->orderPayload($address, ['smoked-salmon' => 1]))
            ->assertStatus(422);

        $this->assertSame(0, Order::count());
    }

    public function test_a_later_price_change_does_not_rewrite_a_past_order(): void
    {
        [$user, $address] = $this->customerWithAddress();
        Sanctum::actingAs($user);

        $this->postJson('/api/orders', $this->orderPayload($address, ['smoked-salmon' => 1]))
            ->assertCreated();

        $originalTotal = Order::first()->total_minor;

        Product::find('smoked-salmon')->update(['price_minor' => 99_000]);

        $this->assertSame($originalTotal, Order::first()->fresh()->total_minor);
        $this->assertSame($originalTotal, Order::first()->items->first()->line_total_minor);
    }

    public function test_fractional_quantities_are_refused_for_goods_sold_by_the_piece(): void
    {
        [$user, $address] = $this->customerWithAddress();
        Sanctum::actingAs($user);

        $piece = Product::where('unit_kind', '!=', 'kg')->firstOrFail();

        $this->postJson('/api/orders', $this->orderPayload($address, [$piece->id => 0.001]))
            ->assertStatus(422)
            ->assertJsonValidationErrors('lines.0.qty');
    }

    public function test_the_same_product_cannot_be_sent_as_two_lines(): void
    {
        [$user, $address] = $this->customerWithAddress();
        Sanctum::actingAs($user);

        $payload = $this->orderPayload($address, ['smoked-salmon' => 1]);
        $payload['lines'][] = ['product_id' => 'smoked-salmon', 'qty' => 1];

        $this->postJson('/api/orders', $payload)
            ->assertStatus(422)
            ->assertJsonValidationErrors('lines');
    }

    public function test_a_quote_matches_what_the_order_is_actually_charged(): void
    {
        [$user, $address] = $this->customerWithAddress();
        Sanctum::actingAs($user);

        $lines = [['product_id' => 'smoked-salmon', 'qty' => 1.234]];

        $quoted = $this->postJson('/api/orders/quote', [
            'lines' => $lines,
            'zone_id' => 'baku-city',
        ])->assertOk()->json('total_minor');

        $this->postJson('/api/orders', $this->orderPayload($address, ['smoked-salmon' => 1.234]))
            ->assertCreated();

        $this->assertSame($quoted, Order::first()->total_minor);
    }
}
