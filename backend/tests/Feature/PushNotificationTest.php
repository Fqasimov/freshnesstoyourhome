<?php

namespace Tests\Feature;

use App\Jobs\SendOrderPush;
use App\Models\Order;
use App\Models\PushToken;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Queue;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class PushNotificationTest extends TestCase
{
    use RefreshDatabase;

    private const TOKEN = 'ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]';

    protected function setUp(): void
    {
        parent::setUp();
        $this->seedCatalogue();
    }

    private function expoOk(int $count = 1): void
    {
        Http::fake([
            'exp.host/*' => Http::response([
                'data' => array_fill(0, $count, ['status' => 'ok', 'id' => 'receipt-id']),
            ]),
        ]);
    }

    /* ── registration ─────────────────────────────────────────────────── */

    public function test_a_device_can_register_for_updates(): void
    {
        $user = User::factory()->create();
        $this->signInAs($user);

        $this->postJson('/api/push-tokens', [
            'token' => self::TOKEN,
            'platform' => 'ios',
            'device_name' => 'iPhone',
        ])->assertCreated();

        $this->assertSame(1, $user->pushTokens()->count());
    }

    public function test_registering_twice_does_not_duplicate_the_device(): void
    {
        $user = User::factory()->create();
        $this->signInAs($user);

        // The app calls this on every launch, because the OS can reissue a
        // token at any time.
        $this->postJson('/api/push-tokens', ['token' => self::TOKEN])->assertCreated();
        $this->postJson('/api/push-tokens', ['token' => self::TOKEN])->assertCreated();

        $this->assertSame(1, PushToken::count());
    }

    public function test_a_malformed_token_is_refused(): void
    {
        $this->signInAs(User::factory()->create());

        foreach (['not-a-token', 'ExponentPushToken[]', '<script>alert(1)</script>', ''] as $bad) {
            $this->postJson('/api/push-tokens', ['token' => $bad])
                ->assertStatus(422);
        }

        $this->assertSame(0, PushToken::count());
    }

    /**
     * A phone can change hands, and signing in has to take the device with it.
     * Leaving the row on the old account would send one person's order updates
     * to a phone that is now somebody else's.
     */
    public function test_signing_in_on_a_used_device_moves_the_token(): void
    {
        $first = User::factory()->create();
        $this->signInAs($first);
        $this->postJson('/api/push-tokens', ['token' => self::TOKEN])->assertCreated();

        $second = User::factory()->create();
        $this->signInAs($second);
        $this->postJson('/api/push-tokens', ['token' => self::TOKEN])->assertCreated();

        $this->assertSame(0, $first->pushTokens()->count());
        $this->assertSame(1, $second->pushTokens()->count());
        $this->assertSame(1, PushToken::count());
    }

    public function test_a_customer_cannot_unregister_another_customers_device(): void
    {
        $victim = User::factory()->create();
        $victim->pushTokens()->create(['token' => self::TOKEN]);

        $this->signInAs(User::factory()->create());
        $this->deleteJson('/api/push-tokens', ['token' => self::TOKEN])->assertOk();

        $this->assertSame(1, $victim->pushTokens()->count());
    }

    public function test_registering_requires_an_account(): void
    {
        $this->postJson('/api/push-tokens', ['token' => self::TOKEN])->assertStatus(401);
    }

    public function test_deleting_an_account_removes_its_devices(): void
    {
        $user = User::factory()->create();
        $user->pushTokens()->create(['token' => self::TOKEN]);

        $user->anonymise();

        $this->assertSame(0, PushToken::count());
    }

    /* ── dispatch ─────────────────────────────────────────────────────── */

    public function test_a_status_change_queues_a_notification(): void
    {
        Queue::fake();

        [$user, $address] = $this->customerWithAddress();
        $this->signInAs($user);
        $this->postJson('/api/orders', $this->orderPayload($address, ['smoked-salmon' => 1]))->assertCreated();

        $order = Order::latest('id')->first();
        $courier = User::factory()->courier()->create();
        $this->signInAs($courier->fresh());

        $this->postJson("/api/staff/orders/{$order->id}/transition", ['status' => 'confirmed'])->assertOk();

        Queue::assertPushed(SendOrderPush::class, fn ($job) =>
            $job->orderId === $order->id && $job->event === 'confirmed');
    }

    public function test_weighing_queues_its_own_notification(): void
    {
        Queue::fake();

        [$user, $address] = $this->customerWithAddress();
        $this->signInAs($user);
        $this->postJson('/api/orders', $this->orderPayload($address, ['smoked-salmon' => 1]))->assertCreated();

        $order = Order::with('items')->latest('id')->first();
        $courier = User::factory()->courier()->create();
        $this->signInAs($courier->fresh());

        $this->postJson("/api/staff/orders/{$order->id}/weights", [
            'weights' => [(string) $order->items->first()->id => 1.2],
        ])->assertOk();

        Queue::assertPushed(SendOrderPush::class, fn ($job) => $job->event === 'weighed');
    }

    /* ── content ──────────────────────────────────────────────────────── */

    /**
     * A notification body lands on a locked screen — the least private place a
     * message can appear. It may say which order moved and how; it may not say
     * where the customer lives or what they are called.
     */
    public function test_a_notification_never_carries_personal_data(): void
    {
        $this->expoOk();

        [$user, $address] = $this->customerWithAddress(['name' => 'Leyla Əliyeva']);
        $this->signInAs($user);
        $this->postJson('/api/orders', $this->orderPayload($address, ['smoked-salmon' => 1]))->assertCreated();

        $order = Order::latest('id')->first();
        $user->pushTokens()->create(['token' => self::TOKEN]);

        (new SendOrderPush($order->id, 'out_for_delivery'))->handle(app(\App\Services\PushSender::class));

        Http::assertSent(function ($request) use ($user) {
            $payload = json_encode($request->data());

            $this->assertStringNotContainsString('Leyla', $payload);
            $this->assertStringNotContainsString('28 May', $payload);
            $this->assertStringNotContainsString((string) $user->phone, $payload);
            $this->assertStringNotContainsString('Second floor', $payload);

            return true;
        });
    }

    public function test_nothing_is_sent_when_an_order_is_merely_placed(): void
    {
        Http::fake();

        [$user, $address] = $this->customerWithAddress();
        $this->signInAs($user);
        $this->postJson('/api/orders', $this->orderPayload($address, ['smoked-salmon' => 1]))->assertCreated();

        $order = Order::latest('id')->first();
        $user->pushTokens()->create(['token' => self::TOKEN]);

        // The customer is looking at the confirmation screen; buzzing their
        // pocket to describe what they just did teaches people to mute us.
        (new SendOrderPush($order->id, 'placed'))->handle(app(\App\Services\PushSender::class));

        Http::assertNothingSent();
    }

    public function test_the_notification_is_in_the_customers_language(): void
    {
        $cases = [
            'az' => 'Kuryer yola çıxdı.',
            'ru' => 'Курьер выехал к вам.',
            'en' => 'Your courier is on the way.',
        ];

        foreach ($cases as $locale => $expected) {
            $this->expoOk();

            [$user, $address] = $this->customerWithAddress(['locale' => $locale]);
            $this->signInAs($user);
            $this->postJson('/api/orders', $this->orderPayload($address, ['smoked-salmon' => 1]))->assertCreated();

            $order = Order::latest('id')->first();
            $user->pushTokens()->create(['token' => 'ExponentPushToken['.$locale.'aaaaaaaaaaaaaaaaa]']);

            (new SendOrderPush($order->id, 'out_for_delivery'))->handle(app(\App\Services\PushSender::class));

            Http::assertSent(fn ($request) => ($request->data()[0]['body'] ?? null) === $expected);
        }
    }

    public function test_the_weighed_notification_carries_the_final_amount(): void
    {
        $this->expoOk();

        [$user, $address] = $this->customerWithAddress();
        $this->signInAs($user);
        $this->postJson('/api/orders', $this->orderPayload($address, ['smoked-salmon' => 1]))->assertCreated();

        $order = Order::with('items')->latest('id')->first();
        $order->forceFill(['final_total_minor' => 7150, 'weighed_at' => now()])->save();

        $user->pushTokens()->create(['token' => self::TOKEN]);

        (new SendOrderPush($order->id, 'weighed'))->handle(app(\App\Services\PushSender::class));

        Http::assertSent(fn ($request) => str_contains($request->data()[0]['body'], '71.50 AZN'));
    }

    /* ── housekeeping ─────────────────────────────────────────────────── */

    /**
     * Expo reports DeviceNotRegistered when the app has been uninstalled. That
     * token will never work again, so keeping it means shouting into the void
     * on every future order — and eventually getting rate limited for it.
     */
    public function test_a_token_expo_reports_as_dead_is_deleted(): void
    {
        Http::fake([
            'exp.host/*' => Http::response([
                'data' => [[
                    'status' => 'error',
                    'message' => 'not registered',
                    'details' => ['error' => 'DeviceNotRegistered'],
                ]],
            ]),
        ]);

        [$user, $address] = $this->customerWithAddress();
        $this->signInAs($user);
        $this->postJson('/api/orders', $this->orderPayload($address, ['smoked-salmon' => 1]))->assertCreated();

        $order = Order::latest('id')->first();
        $user->pushTokens()->create(['token' => self::TOKEN]);

        (new SendOrderPush($order->id, 'delivered'))->handle(app(\App\Services\PushSender::class));

        $this->assertSame(0, PushToken::count());
    }

    public function test_the_push_service_being_down_does_not_break_an_order(): void
    {
        // The courier is in a basement and the push service is unreachable.
        // The order must still move.
        Http::fake(['exp.host/*' => Http::response('gateway timeout', 504)]);

        [$user, $address] = $this->customerWithAddress();
        $this->signInAs($user);
        $this->postJson('/api/orders', $this->orderPayload($address, ['smoked-salmon' => 1]))->assertCreated();

        $order = Order::latest('id')->first();
        $user->pushTokens()->create(['token' => self::TOKEN]);

        $courier = User::factory()->courier()->create();
        $this->signInAs($courier->fresh());

        $this->postJson("/api/staff/orders/{$order->id}/transition", ['status' => 'confirmed'])->assertOk();

        $this->assertSame('confirmed', $order->fresh()->status);
        // The token survives a transport failure; only Expo saying the device
        // is gone removes it.
        $this->assertSame(1, PushToken::count());
    }

    public function test_a_customer_with_no_device_is_simply_skipped(): void
    {
        Http::fake();

        [$user, $address] = $this->customerWithAddress();
        $this->signInAs($user);
        $this->postJson('/api/orders', $this->orderPayload($address, ['smoked-salmon' => 1]))->assertCreated();

        (new SendOrderPush(Order::latest('id')->first()->id, 'confirmed'))
            ->handle(app(\App\Services\PushSender::class));

        Http::assertNothingSent();
    }
}
