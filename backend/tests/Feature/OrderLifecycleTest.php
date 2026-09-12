<?php

namespace Tests\Feature;

use App\Models\Order;
use App\Models\OrderEvent;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class OrderLifecycleTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seedCatalogue();
    }

    private function placeOrder(): array
    {
        [$user, $address] = $this->customerWithAddress();
        Sanctum::actingAs($user);
        $this->postJson('/api/orders', $this->orderPayload($address, ['smoked-salmon' => 1]))->assertCreated();

        // latest(), not first(): this helper is called repeatedly and each
        // call must return the order it just placed.
        return [$user, Order::latest('created_at')->latest('id')->first()];
    }

    public function test_an_order_walks_the_expected_path(): void
    {
        [$user, $order] = $this->placeOrder();

        $courier = User::factory()->courier()->create();
        Sanctum::actingAs($courier->fresh());

        foreach (['confirmed', 'preparing', 'out_for_delivery', 'delivered'] as $status) {
            $this->postJson("/api/staff/orders/{$order->id}/transition", ['status' => $status])->assertOk();
        }

        $this->assertSame('delivered', $order->fresh()->status);
        $this->assertNotNull($order->fresh()->delivered_at);
    }

    public function test_a_delivered_order_cannot_move_again(): void
    {
        [$user, $order] = $this->placeOrder();
        $courier = User::factory()->courier()->create();
        Sanctum::actingAs($courier->fresh());

        foreach (['confirmed', 'preparing', 'out_for_delivery', 'delivered'] as $status) {
            $this->postJson("/api/staff/orders/{$order->id}/transition", ['status' => $status])->assertOk();
        }

        foreach (['preparing', 'cancelled', 'placed'] as $status) {
            $this->postJson("/api/staff/orders/{$order->id}/transition", ['status' => $status])
                ->assertStatus(422);
        }

        $this->assertSame('delivered', $order->fresh()->status);
    }

    public function test_a_status_cannot_be_skipped(): void
    {
        [$user, $order] = $this->placeOrder();
        $courier = User::factory()->courier()->create();
        Sanctum::actingAs($courier->fresh());

        // placed -> delivered would mean nobody prepared or carried it.
        $this->postJson("/api/staff/orders/{$order->id}/transition", ['status' => 'delivered'])
            ->assertStatus(422);
    }

    public function test_a_customer_may_cancel_before_the_order_leaves(): void
    {
        [$user, $order] = $this->placeOrder();

        $this->postJson("/api/orders/{$order->id}/cancel", ['reason' => 'Changed my mind'])
            ->assertOk()
            ->assertJsonPath('status', 'cancelled');

        $this->assertSame('Changed my mind', $order->fresh()->cancel_reason);
        $this->assertNotNull($order->fresh()->cancelled_at);
    }

    public function test_a_customer_cannot_cancel_once_it_is_on_its_way(): void
    {
        [$user, $order] = $this->placeOrder();

        $courier = User::factory()->courier()->create();
        Sanctum::actingAs($courier->fresh());
        foreach (['confirmed', 'preparing', 'out_for_delivery'] as $status) {
            $this->postJson("/api/staff/orders/{$order->id}/transition", ['status' => $status])->assertOk();
        }

        Sanctum::actingAs($user);
        $this->postJson("/api/orders/{$order->id}/cancel")->assertStatus(422);

        $this->assertSame('out_for_delivery', $order->fresh()->status);
    }

    public function test_every_transition_leaves_an_audit_trail(): void
    {
        [$user, $order] = $this->placeOrder();

        $courier = User::factory()->courier()->create();
        Sanctum::actingAs($courier->fresh());
        $this->postJson("/api/staff/orders/{$order->id}/transition", ['status' => 'confirmed'])->assertOk();

        $events = OrderEvent::where('order_id', $order->id)->orderBy('id')->get();

        $this->assertSame('placed', $events[0]->to_status);
        $this->assertSame('customer', $events[0]->actor_role);
        $this->assertSame('confirmed', $events[1]->to_status);
        $this->assertSame('courier', $events[1]->actor_role);
        $this->assertSame($courier->id, $events[1]->actor_id);
    }

    public function test_the_order_code_is_not_guessable_or_sequential(): void
    {
        $codes = [];
        for ($i = 0; $i < 5; $i++) {
            [$user, $order] = $this->placeOrder();
            $codes[] = $order->code;
            $this->assertMatchesRegularExpression('/^FR-[23456789ABCDEFGHJKLMNPQRSTUVWXYZ]{6}$/', $order->code);
        }

        $this->assertSame(count($codes), count(array_unique($codes)));
    }

    public function test_delivery_must_be_at_least_a_day_ahead(): void
    {
        [$user, $address] = $this->customerWithAddress();
        Sanctum::actingAs($user);

        $payload = $this->orderPayload($address, ['smoked-salmon' => 1]);
        $payload['delivery_date'] = now()->toDateString();

        $this->postJson('/api/orders', $payload)
            ->assertStatus(422)
            ->assertJsonValidationErrors('delivery_date');
    }

    public function test_delivery_cannot_be_scheduled_absurdly_far_ahead(): void
    {
        [$user, $address] = $this->customerWithAddress();
        Sanctum::actingAs($user);

        $payload = $this->orderPayload($address, ['smoked-salmon' => 1]);
        $payload['delivery_date'] = now()->addYear()->toDateString();

        $this->postJson('/api/orders', $payload)
            ->assertStatus(422)
            ->assertJsonValidationErrors('delivery_date');
    }
}
