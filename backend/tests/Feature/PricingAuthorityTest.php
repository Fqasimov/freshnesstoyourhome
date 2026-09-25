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
        $this->signInAs($user);

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
        // The total is the goods plus the area's delivery fee — spelled out
        // rather than assumed equal to the subtotal, which only held while the
        // seeded zones carried a fee of zero.
        $this->assertSame($salmon->price_minor + $order->delivery_fee_minor, $order->total_minor);
        $this->assertSame(0, $order->discount_minor);
        $this->assertSame($salmon->price_minor, $order->items->first()->unit_price_minor);
    }

    public function test_an_inactive_product_cannot_be_ordered(): void
    {
        [$user, $address] = $this->customerWithAddress();
        $this->signInAs($user);

        Product::find('smoked-salmon')->update(['is_active' => false]);

        $this->postJson('/api/orders', $this->orderPayload($address, ['smoked-salmon' => 1]))
            ->assertStatus(422)
            ->assertJsonPath('unavailable_product_ids.0', 'smoked-salmon');

        $this->assertSame(0, Order::count());
    }

    public function test_an_out_of_stock_product_cannot_be_ordered(): void
    {
        [$user, $address] = $this->customerWithAddress();
        $this->signInAs($user);

        Product::find('smoked-salmon')->update(['in_stock' => false]);

        $this->postJson('/api/orders', $this->orderPayload($address, ['smoked-salmon' => 1]))
            ->assertStatus(422);

        $this->assertSame(0, Order::count());
    }

    public function test_a_later_price_change_does_not_rewrite_a_past_order(): void
    {
        [$user, $address] = $this->customerWithAddress();
        $this->signInAs($user);

        $this->postJson('/api/orders', $this->orderPayload($address, ['smoked-salmon' => 1]))
            ->assertCreated();

        $originalTotal = Order::first()->total_minor;
        $originalLine = Order::first()->items->first()->line_total_minor;

        Product::find('smoked-salmon')->update(['price_minor' => 99_000]);

        $this->assertSame($originalTotal, Order::first()->fresh()->total_minor);
        $this->assertSame($originalLine, Order::first()->items->first()->line_total_minor);
    }

    public function test_fractional_quantities_are_refused_for_goods_sold_by_the_piece(): void
    {
        [$user, $address] = $this->customerWithAddress();
        $this->signInAs($user);

        $piece = Product::where('unit_kind', '!=', 'kg')->firstOrFail();

        $this->postJson('/api/orders', $this->orderPayload($address, [$piece->id => 0.001]))
            ->assertStatus(422)
            ->assertJsonValidationErrors('lines.0.qty');
    }

    public function test_the_same_product_cannot_be_sent_as_two_lines(): void
    {
        [$user, $address] = $this->customerWithAddress();
        $this->signInAs($user);

        $payload = $this->orderPayload($address, ['smoked-salmon' => 1]);
        $payload['lines'][] = ['product_id' => 'smoked-salmon', 'qty' => 1];

        $this->postJson('/api/orders', $payload)
            ->assertStatus(422)
            ->assertJsonValidationErrors('lines');
    }

    /**
     * The basket renders in the language the app is showing.
     *
     * Quoting is public, so there may be no account to read a preference
     * from — and the framework's own default locale is English, which is the
     * one language this shop's customers are least likely to want. Without the
     * client stating its language, an Azerbaijani basket listed its contents
     * in English.
     */
    public function test_a_quote_is_returned_in_the_language_the_client_asks_for(): void
    {
        $lines = [['product_id' => 'smoked-salmon', 'qty' => 1]];

        $expected = [
            'az' => 'Hisə verilmiş qızıl balıq',
            'ru' => 'Лосось холодного копчения',
            'en' => 'Smoked Salmon',
        ];

        foreach ($expected as $locale => $name) {
            $this->postJson('/api/orders/quote', ['lines' => $lines, 'locale' => $locale])
                ->assertOk()
                ->assertJsonPath('lines.0.name', $name);
        }
    }

    public function test_a_quote_falls_back_to_azerbaijani_when_no_language_is_given(): void
    {
        $this->postJson('/api/orders/quote', [
            'lines' => [['product_id' => 'smoked-salmon', 'qty' => 1]],
        ])->assertOk()->assertJsonPath('lines.0.name', 'Hisə verilmiş qızıl balıq');
    }

    public function test_a_basket_can_be_priced_without_signing_in(): void
    {
        // Browsing and building a basket before registering is the point: an
        // app that demands an account to show a total is both worse to use and
        // the shape App Store review rejects.
        $this->postJson('/api/orders/quote', [
            'lines' => [['product_id' => 'smoked-salmon', 'qty' => 0.5]],
            'zone_id' => self::ZONE,
        ])->assertOk()
            ->assertJsonPath('subtotal_minor', 3250)      // half a kilo of salmon
            ->assertJsonPath('delivery_fee_minor', 500)   // Mərkəz, flat five manats
            ->assertJsonPath('total_minor', 3750);
    }

    public function test_a_quote_matches_what_the_order_is_actually_charged(): void
    {
        [$user, $address] = $this->customerWithAddress();
        $this->signInAs($user);

        $lines = [['product_id' => 'smoked-salmon', 'qty' => 1.234]];

        $quoted = $this->postJson('/api/orders/quote', [
            'lines' => $lines,
            'zone_id' => self::ZONE,
        ])->assertOk()->json('total_minor');

        $this->postJson('/api/orders', $this->orderPayload($address, ['smoked-salmon' => 1.234]))
            ->assertCreated();

        $this->assertSame($quoted, Order::first()->total_minor);
    }
}
