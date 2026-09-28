<?php

namespace Tests\Feature;

use App\Mail\LoginCodeMail;
use App\Models\AdminAudit;
use App\Models\DeliveryZone;
use App\Models\LoginCode;
use App\Models\Order;
use App\Models\User;
use App\Services\OrderService;
use App\Services\OrderRejected;
use App\Support\Audit;
use App\Support\BlindIndex;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Mail;
use Tests\TestCase;

/**
 * One test per finding of the September 2026 security scan, each asserting
 * the fixed behaviour so the hole cannot quietly reopen.
 */
class ScanFixesTest extends TestCase
{
    use RefreshDatabase;

    private const ADMIN = 'info@freshnesstoyourhome.az';

    protected function setUp(): void
    {
        parent::setUp();

        $this->seedCatalogue();
        Mail::fake();
    }

    private function lastCodeTo(string $email): string
    {
        $code = null;
        Mail::assertQueued(LoginCodeMail::class, function (LoginCodeMail $m) use ($email, &$code) {
            if ($m->hasTo($email)) {
                $code = $m->code;
            }

            return true;
        });

        return $code;
    }

    public function test_a_code_with_no_attempts_left_refuses_even_the_right_code(): void
    {
        $this->postJson('/api/auth/request-code', ['email' => 'a@example.com'])->assertOk();
        $code = $this->lastCodeTo('a@example.com');

        // What a burst of parallel guesses leaves behind: every attempt spent.
        LoginCode::query()->update(['attempts' => (int) config('freshness.auth.max_attempts')]);

        $this->postJson('/api/auth/verify-code', ['email' => 'a@example.com', 'code' => $code])
            ->assertStatus(422);
    }

    public function test_each_guess_is_counted_before_it_is_checked(): void
    {
        $this->postJson('/api/auth/request-code', ['email' => 'b@example.com'])->assertOk();

        $this->postJson('/api/auth/verify-code', ['email' => 'b@example.com', 'code' => '000000']);

        $this->assertSame(1, LoginCode::first()->attempts);
    }

    public function test_changing_the_letter_case_does_not_buy_more_guesses(): void
    {
        $this->postJson('/api/auth/request-code', ['email' => 'c@example.com'])->assertOk();

        for ($i = 0; $i < 6; $i++) {
            $email = $i % 2 ? 'C@EXAMPLE.COM' : 'c@example.com';
            $this->withServerVariables(['REMOTE_ADDR' => "10.0.0.{$i}"])
                ->postJson('/api/auth/verify-code', ['email' => $email, 'code' => '000000']);
        }

        $this->withServerVariables(['REMOTE_ADDR' => '10.0.0.99'])
            ->postJson('/api/auth/verify-code', ['email' => 'C@example.com', 'code' => '000000'])
            ->assertStatus(429);
    }

    public function test_shop_requests_cannot_lock_the_admin_out_of_the_panel(): void
    {
        config(['freshness.admin.emails' => [self::ADMIN]]);

        // Someone spends the shop's whole budget for the admin's address...
        for ($i = 0; $i < 6; $i++) {
            $this->withServerVariables(['REMOTE_ADDR' => "10.1.0.{$i}"])
                ->postJson('/api/auth/request-code', ['email' => self::ADMIN]);
        }

        // ...and the panel still sends a code, which still works.
        Mail::fake();
        $this->postJson('/api/auth/panel/request-code', ['email' => self::ADMIN])->assertOk();
        $code = $this->lastCodeTo(self::ADMIN);

        // A shop request after the panel one does not kill it either.
        $this->withServerVariables(['REMOTE_ADDR' => '10.1.1.1'])
            ->postJson('/api/auth/request-code', ['email' => self::ADMIN]);

        $this->postJson('/api/auth/panel/verify-code', ['email' => self::ADMIN, 'code' => $code])
            ->assertOk()
            ->assertJsonStructure(['ticket']);
    }

    public function test_an_order_to_a_switched_off_area_is_refused(): void
    {
        [$user, $address] = $this->customerWithAddress();
        $this->signInAs($user);

        DeliveryZone::whereKey(self::ZONE)->update(['is_active' => false]);

        $this->postJson('/api/orders', $this->orderPayload($address, ['smoked-salmon' => 1]))
            ->assertStatus(422);

        $this->assertSame(0, Order::count());
    }

    public function test_a_customer_cannot_cancel_once_preparation_has_begun(): void
    {
        [$user, $address] = $this->customerWithAddress();
        $this->signInAs($user);
        $this->postJson('/api/orders', $this->orderPayload($address, ['smoked-salmon' => 1]))->assertCreated();

        // Staff move it on between the customer's read and the cancel.
        $order = Order::first();
        $order->forceFill(['status' => Order::PREPARING])->save();

        $this->expectException(OrderRejected::class);
        app(OrderService::class)->transition($order, Order::CANCELLED, $user, null, byCustomer: true);
    }

    public function test_a_courier_list_has_no_contact_details_and_a_single_view_is_recorded(): void
    {
        [$user, $address] = $this->customerWithAddress(['name' => 'Aysel', 'phone' => '+994501234567']);
        $this->signInAs($user);
        $this->postJson('/api/orders', $this->orderPayload($address, ['smoked-salmon' => 1]))->assertCreated();
        $order = Order::first();

        $courier = User::factory()->courier()->create();
        $this->signInAs($courier->fresh());

        $list = $this->getJson('/api/staff/orders')->assertOk()->json('data.0');
        $this->assertNull($list['contact_phone']);
        $this->assertNull($list['address_line']);

        $this->getJson("/api/staff/orders/{$order->id}")
            ->assertOk()
            ->assertJsonPath('order.contact_phone', '+994501234567');

        $this->assertTrue(AdminAudit::where('action', 'order.view')->where('subject_id', $order->id)->exists());
    }

    public function test_a_courier_list_leaves_out_closed_orders(): void
    {
        [$user, $address] = $this->customerWithAddress();
        $this->signInAs($user);
        $this->postJson('/api/orders', $this->orderPayload($address, ['smoked-salmon' => 1]))->assertCreated();
        Order::query()->update(['status' => Order::DELIVERED]);

        $this->signInAs(User::factory()->courier()->create()->fresh());

        $this->assertSame([], $this->getJson('/api/staff/orders')->assertOk()->json('data'));
    }

    public function test_a_courier_who_moved_orders_is_anonymised_not_deleted(): void
    {
        [$user, $address] = $this->customerWithAddress();
        $this->signInAs($user);
        $this->postJson('/api/orders', $this->orderPayload($address, ['smoked-salmon' => 1]))->assertCreated();
        $order = Order::first();

        $courier = User::factory()->courier()->create();
        $this->signInAs($courier->fresh());
        $this->postJson("/api/staff/orders/{$order->id}/transition", ['status' => 'confirmed'])->assertOk();

        $this->deleteJson('/api/me')->assertOk();

        $this->assertNotNull(User::find($courier->id), 'the row stays, so the order history keeps its author');
        $this->assertSame(1, $order->events()->where('actor_id', $courier->id)->count());
    }

    public function test_blanking_every_audit_hash_is_reported_as_tampering(): void
    {
        $admin = User::factory()->create();
        Audit::record($admin, 'product.update', 'product', 'a');
        Audit::record($admin, 'product.update', 'product', 'b');

        $this->assertTrue(Audit::verify()['intact']);

        AdminAudit::query()->update(['hash' => null, 'prev_hash' => null]);

        $this->assertFalse(Audit::verify()['intact']);
    }

    public function test_the_map_link_check_matches_whole_host_names(): void
    {
        [$user] = $this->customerWithAddress();
        $this->signInAs($user);

        $body = ['line' => 'Nizami küçəsi 10', 'delivery_zone_id' => self::ZONE];

        $this->postJson('/api/addresses', $body + ['map_link' => 'https://maps.app.goo.gl.evil.test/x'])->assertStatus(422);
        $this->postJson('/api/addresses', $body + ['map_link' => 'https://maps.app.goo.gl/AbC123'])->assertCreated();
    }

    public function test_panel_and_shop_codes_are_filed_apart(): void
    {
        $this->assertNotSame(
            BlindIndex::ofEmail(self::ADMIN),
            BlindIndex::ofProvider('panel', self::ADMIN),
        );
    }
}
