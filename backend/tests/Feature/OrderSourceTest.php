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
            'contact_first_name' => '', 'contact_last_name' => '', 'contact_phone' => 'call me', 'zone_id' => 'nowhere',
        ]))->assertStatus(422)->assertJsonValidationErrors(['contact_first_name', 'contact_last_name', 'contact_phone', 'zone_id']);

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

    public function test_the_address_and_map_link_are_optional(): void
    {
        $order = $this->webOrder();
        unset($order['address_line']);

        $res = $this->postJson('/api/orders/web', $order)->assertCreated()->json();
        $this->assertNull(Order::findOrFail($res['id'])->address_line);
    }

    public function test_an_address_that_is_given_must_be_typed_text_not_a_link_or_digits(): void
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

    public function test_a_website_order_can_carry_a_note_and_a_delivery_date(): void
    {
        $date = $this->deliverableDate();

        $res = $this->postJson('/api/orders/web', $this->webOrder([
            'note' => 'Zəng etməyin, qapıda qoyun', 'delivery_date' => $date,
        ]))->assertCreated()->json();

        $order = Order::findOrFail($res['id']);
        $this->assertSame('Zəng etməyin, qapıda qoyun', $order->customer_note);
        $this->assertSame($date, $order->delivery_date->toDateString());
    }

    public function test_the_note_and_the_date_are_optional_but_a_date_must_be_one_the_shop_takes(): void
    {
        $this->postJson('/api/orders/web', $this->webOrder())->assertCreated();

        $this->postJson('/api/orders/web', $this->webOrder(['delivery_date' => now()->subDay()->toDateString()]))
            ->assertStatus(422)->assertJsonValidationErrors(['delivery_date']);
    }

    public function test_the_map_link_must_be_a_google_maps_address(): void
    {
        // Eleven requests in a minute is what the limiter exists to stop; this
        // test is about the link, not the limiter.
        $this->withoutMiddleware(\Illuminate\Routing\Middleware\ThrottleRequests::class);

        foreach ([
            'https://www.google.com/maps?q=40.409300,49.867100',
            'https://maps.app.goo.gl/AbCdEf',
            'https://goo.gl/maps/AbCdEf',
            'https://maps.google.com/?q=40.4,49.8',
            'https://www.google.az/maps/place/Baku',
        ] as $ok) {
            $this->postJson('/api/orders/web', $this->webOrder(['map_link' => $ok]))->assertCreated();
        }

        foreach ([
            'https://www.google.com/url?q=https://evil.test',
            'https://maps.google.com/url?q=https://evil.test',
            'https://www.google.com/mapsevil',
            'https://goo.gl/maps',
            'https://goo.gl/mapsXYZ',
            'https://google.com.evil.test/maps',
            'https://www.google.com@evil.test/maps',
            'http://www.google.com/maps?q=1,1',
            'javascript:alert(1)',
        ] as $bad) {
            $this->postJson('/api/orders/web', $this->webOrder(['map_link' => $bad]))
                ->assertStatus(422)->assertJsonValidationErrors(['map_link']);
        }
    }

    public function test_a_phone_number_or_name_with_a_line_break_is_refused(): void
    {
        $this->withoutMiddleware(\Illuminate\Routing\Middleware\ThrottleRequests::class);

        $this->postJson('/api/orders/web', $this->webOrder(['contact_phone' => "+99450\n1112233"]))
            ->assertStatus(422)->assertJsonValidationErrors(['contact_phone']);
        $this->postJson('/api/orders/web', $this->webOrder(['contact_first_name' => "Aysel\nMəmmədova"]))
            ->assertStatus(422)->assertJsonValidationErrors(['contact_first_name']);
    }

    public function test_one_phone_number_cannot_be_used_for_more_than_a_few_orders_a_day(): void
    {
        // Different sources, same number: the per-source limit never trips.
        $statuses = [];
        for ($i = 1; $i <= 7; $i++) {
            $statuses[] = $this->withServerVariables(['REMOTE_ADDR' => "203.0.113.$i"])
                ->postJson('/api/orders/web', $this->webOrder())->status();
        }

        $this->assertSame(array_fill(0, 6, 201), array_slice($statuses, 0, 6));
        $this->assertSame(429, $statuses[6]);
    }

    public function test_an_ipv6_source_is_counted_by_its_slash_64(): void
    {
        $a = \App\Providers\AppServiceProvider::sourceKey('2001:db8:1:2:aaaa:bbbb:cccc:dddd');
        $b = \App\Providers\AppServiceProvider::sourceKey('2001:db8:1:2:1111:2222:3333:4444');
        $c = \App\Providers\AppServiceProvider::sourceKey('2001:db8:1:3::1');

        $this->assertSame($a, $b);
        $this->assertNotSame($a, $c);
        $this->assertSame('203.0.113.9', \App\Providers\AppServiceProvider::sourceKey('203.0.113.9'));
    }

    public function test_an_order_that_comes_to_nothing_is_refused(): void
    {
        $this->withoutMiddleware(\Illuminate\Routing\Middleware\ThrottleRequests::class);

        // 0.001 kg of a cheap kilo rounds to no qəpik at all.
        \App\Models\Product::where('id', 'smoked-salmon')->update(['price_minor' => 100]);
        $order = $this->webOrder(['lines' => [['product_id' => 'smoked-salmon', 'qty' => 0.001]]]);

        $this->postJson('/api/orders/web', $order)->assertStatus(422);
    }

    public function test_a_limiter_is_not_thrown_by_a_non_text_email(): void
    {
        foreach (['/api/auth/verify-code', '/api/auth/login', '/api/auth/panel/verify-code', '/api/auth/panel/request-code'] as $path) {
            $this->postJson($path, ['email' => ['x'], 'code' => '123456', 'password' => 'x'])->assertStatus(422);
        }
    }

    public function test_one_account_cannot_keep_unlimited_addresses_or_push_tokens(): void
    {
        [$user] = $this->customerWithAddress(['name' => 'Nicat', 'phone' => '+994501112233']);
        $this->signInAs($user);

        for ($i = 0; $i < 25; $i++) {
            $this->postJson('/api/push-tokens', ['token' => 'ExponentPushToken[abcdefghijklmnop'.$i.']']);
        }
        $this->assertLessThanOrEqual(10, \App\Models\PushToken::where('user_id', $user->id)->count());

        $made = 0;
        for ($i = 0; $i < 22; $i++) {
            $made += $this->postJson('/api/addresses', ['line' => "Küçə {$i}, ev 14", 'delivery_zone_id' => 'merkez'])->status() === 201 ? 1 : 0;
        }
        $this->assertLessThanOrEqual(20, $user->addresses()->count());
    }
}
