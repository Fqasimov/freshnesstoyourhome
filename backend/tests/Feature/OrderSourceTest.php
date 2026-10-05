<?php

namespace Tests\Feature;

use App\Models\Order;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Every order lands in the panel, whichever door it came through, and says
 * which door that was.
 */
class OrderSourceTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seedCatalogue();
    }

    private function webOrder(array $overrides = []): array
    {
        return array_merge([
            'lines' => [['product_id' => 'smoked-salmon', 'qty' => 1]],
            'zone_id' => self::ZONE,
            'contact_first_name' => 'Aysel',
            'contact_last_name' => 'Məmmədova',
            'contact_phone' => '+994 50 123 45 67',
            'address_line' => 'Nizami küçəsi 10, mənzil 4',
        ], $overrides);
    }

    public function test_a_website_order_is_priced_by_the_server_and_marked_web(): void
    {
        $res = $this->postJson('/api/orders/web', $this->webOrder([
            // Anything price-shaped a hostile page might send is ignored.
            'total_minor' => 1, 'price_minor' => 1,
        ]))->assertCreated()->json();

        $order = Order::findOrFail($res['id']);
        $this->assertSame('web', $order->source);
        $this->assertNull($order->user_id);
        $this->assertSame('Aysel Məmmədova', $order->contact_name);
        $this->assertGreaterThan(1, $order->total_minor);
        $this->assertSame($order->code, $res['code']);
    }

    public function test_a_website_order_needs_a_name_phone_address_and_active_zone(): void
    {
        $this->postJson('/api/orders/web', $this->webOrder([
            'contact_first_name' => '', 'contact_last_name' => '', 'contact_phone' => 'call me', 'address_line' => '', 'zone_id' => 'nowhere',
        ]))->assertStatus(422)->assertJsonValidationErrors(['contact_first_name', 'contact_last_name', 'contact_phone', 'address_line', 'zone_id']);

        $this->assertSame(0, Order::count());
    }

    public function test_website_orders_are_rate_limited(): void
    {
        for ($i = 0; $i < 3; $i++) {
            $this->postJson('/api/orders/web', $this->webOrder())->assertCreated();
        }
        $this->postJson('/api/orders/web', $this->webOrder())->assertStatus(429);
    }

    public function test_an_app_order_records_the_phone_it_came_from(): void
    {
        [$user, $address] = $this->customerWithAddress(['name' => 'Nicat', 'phone' => '+994501112233']);
        $this->signInAs($user);

        $this->withHeader('X-Client', 'android')
            ->postJson('/api/orders', $this->orderPayload($address, ['smoked-salmon' => 1]))
            ->assertCreated()->assertJsonPath('source', 'android');

        $this->withHeader('X-Client', 'something-else')
            ->postJson('/api/orders', $this->orderPayload($address, ['smoked-trout' => 1]))
            ->assertCreated()->assertJsonPath('source', 'app');
    }

    public function test_the_panel_sees_website_and_app_orders_together_with_their_source(): void
    {
        $this->postJson('/api/orders/web', $this->webOrder())->assertCreated();

        [$user, $address] = $this->customerWithAddress(['name' => 'Nicat', 'phone' => '+994501112233']);
        $this->signInAs($user);
        $this->withHeader('X-Client', 'ios')
            ->postJson('/api/orders', $this->orderPayload($address, ['smoked-salmon' => 1]))->assertCreated();

        $admin = User::factory()->create();
        $admin->promote(User::ROLE_ADMIN);
        $this->signInAs($admin->fresh());

        $sources = collect($this->getJson('/api/staff/orders')->assertOk()->json('data'))->pluck('source')->sort()->values()->all();
        $this->assertSame(['ios', 'web'], $sources);

        $this->assertSame(['web'], collect($this->getJson('/api/staff/orders?source=web')->json('data'))->pluck('source')->all());
    }

    public function test_first_name_and_surname_are_both_required_and_stored_together(): void
    {
        // Several posts in one test; the per-address brake has its own test.
        $this->withoutMiddleware(\Illuminate\Routing\Middleware\ThrottleRequests::class);

        $this->postJson('/api/orders/web', $this->webOrder(['contact_last_name' => '']))
            ->assertStatus(422)->assertJsonValidationErrors(['contact_last_name']);

        $res = $this->postJson('/api/orders/web', $this->webOrder())->assertCreated()->json();
        $this->assertSame('Aysel Məmmədova', Order::findOrFail($res['id'])->contact_name);
    }

    public function test_a_name_cannot_carry_digits_links_or_markup(): void
    {
        // Several posts in one test; the per-address brake has its own test.
        $this->withoutMiddleware(\Illuminate\Routing\Middleware\ThrottleRequests::class);

        foreach (['A1ysel', 'https://x.az', '<b>Aysel</b>', '12345'] as $bad) {
            $this->postJson('/api/orders/web', $this->webOrder(['contact_first_name' => $bad]))
                ->assertStatus(422)->assertJsonValidationErrors(['contact_first_name']);
        }
    }

    public function test_the_address_must_be_typed_text_not_a_link_or_digits(): void
    {
        // Several posts in one test; the per-address brake has its own test.
        $this->withoutMiddleware(\Illuminate\Routing\Middleware\ThrottleRequests::class);

        foreach (['12345', 'https://maps.app.goo.gl/abc', '<script>x</script>'] as $bad) {
            $this->postJson('/api/orders/web', $this->webOrder(['address_line' => $bad]))
                ->assertStatus(422)->assertJsonValidationErrors(['address_line']);
        }
    }

    public function test_an_older_page_that_sends_one_name_field_still_works_when_it_has_two_words(): void
    {
        // Several posts in one test; the per-address brake has its own test.
        $this->withoutMiddleware(\Illuminate\Routing\Middleware\ThrottleRequests::class);

        $order = $this->webOrder();
        unset($order['contact_first_name'], $order['contact_last_name']);

        $this->postJson('/api/orders/web', $order + ['contact_name' => 'Aysel Məmmədova'])->assertCreated();
        $this->postJson('/api/orders/web', $order + ['contact_name' => 'Aysel'])
            ->assertStatus(422)->assertJsonValidationErrors(['contact_last_name']);
    }
}
