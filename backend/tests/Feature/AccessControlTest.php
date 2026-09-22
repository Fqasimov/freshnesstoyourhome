<?php

namespace Tests\Feature;

use App\Models\Order;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/**
 * Who may see and do what.
 *
 * Two failures would be worst here: a customer promoting themselves, and a
 * customer reading somebody else's order. Both are cheap to test and expensive
 * to discover in production.
 */
class AccessControlTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seedCatalogue();
    }

    public function test_a_customer_cannot_make_themselves_an_admin(): void
    {
        $user = User::factory()->create();
        Sanctum::actingAs($user);

        foreach (['admin', 'courier'] as $role) {
            $this->patchJson('/api/me', ['name' => 'Ali', 'role' => $role])->assertOk();
            $this->assertSame('customer', $user->fresh()->role);
        }
    }

    public function test_a_customer_cannot_promote_themselves_at_registration(): void
    {
        // The registration path creates the user from the verified address
        // alone; nothing from the request body reaches the model.
        $user = new User(['email' => 'x@example.com', 'role' => 'admin', 'name' => 'X']);
        $user->save();

        $this->assertSame('customer', $user->fresh()->role);
    }

    public function test_a_customer_cannot_overwrite_their_own_lookup_hash(): void
    {
        $user = User::factory()->create();
        Sanctum::actingAs($user);

        $victim = User::factory()->create(['email' => 'victim@example.com']);
        $victimHash = $victim->fresh()->email_hash;

        $this->patchJson('/api/me', [
            'name' => 'Ali',
            'email_hash' => $victimHash,
            'email' => 'victim@example.com',
        ])->assertOk();

        $this->assertNotSame($victimHash, $user->fresh()->email_hash);
    }

    public function test_a_customer_cannot_read_another_customers_order(): void
    {
        [$owner, $address] = $this->customerWithAddress();
        Sanctum::actingAs($owner);
        $this->postJson('/api/orders', $this->orderPayload($address, ['smoked-salmon' => 1]))->assertCreated();
        $orderId = Order::first()->id;

        $stranger = User::factory()->create();
        Sanctum::actingAs($stranger);

        // 404, not 403 — a 403 would confirm the order exists.
        $this->getJson("/api/orders/{$orderId}")->assertStatus(404);
        $this->postJson("/api/orders/{$orderId}/cancel")->assertStatus(404);
    }

    public function test_a_customer_only_sees_their_own_orders_in_the_list(): void
    {
        [$owner, $address] = $this->customerWithAddress();
        Sanctum::actingAs($owner);
        $this->postJson('/api/orders', $this->orderPayload($address, ['smoked-salmon' => 1]))->assertCreated();

        $stranger = User::factory()->create();
        Sanctum::actingAs($stranger);

        $this->getJson('/api/orders')->assertOk()->assertJsonCount(0, 'data');
    }

    public function test_a_customer_cannot_use_another_customers_address(): void
    {
        [$victim, $victimAddress] = $this->customerWithAddress();

        $attacker = User::factory()->create();
        Sanctum::actingAs($attacker);

        // Ordering to an address that is not theirs would deliver a stranger's
        // goods to a stranger's door, and expose that address in the response.
        $this->postJson('/api/orders', $this->orderPayload($victimAddress, ['smoked-salmon' => 1]))
            ->assertStatus(404);

        $this->assertSame(0, Order::count());
    }

    public function test_a_customer_cannot_edit_or_delete_another_customers_address(): void
    {
        [$victim, $victimAddress] = $this->customerWithAddress();

        $attacker = User::factory()->create();
        Sanctum::actingAs($attacker);

        $this->putJson("/api/addresses/{$victimAddress->id}", [
            'line' => 'Somewhere else entirely',
            'delivery_zone_id' => self::ZONE,
        ])->assertStatus(404);

        $this->deleteJson("/api/addresses/{$victimAddress->id}")->assertStatus(404);

        $this->assertSame('28 May küçəsi 14, mənzil 7', $victimAddress->fresh()->line);
    }

    public function test_staff_routes_are_invisible_to_a_customer(): void
    {
        [$owner, $address] = $this->customerWithAddress();
        Sanctum::actingAs($owner);
        $this->postJson('/api/orders', $this->orderPayload($address, ['smoked-salmon' => 1]))->assertCreated();
        $orderId = Order::first()->id;

        $this->getJson('/api/staff/orders')->assertStatus(404);
        $this->postJson("/api/staff/orders/{$orderId}/transition", ['status' => 'confirmed'])->assertStatus(404);
        $this->postJson("/api/staff/orders/{$orderId}/weights", ['weights' => ['1' => 1]])->assertStatus(404);
    }

    public function test_staff_routes_work_for_a_courier(): void
    {
        [$owner, $address] = $this->customerWithAddress();
        Sanctum::actingAs($owner);
        $this->postJson('/api/orders', $this->orderPayload($address, ['smoked-salmon' => 1]))->assertCreated();

        $courier = User::factory()->courier()->create();
        Sanctum::actingAs($courier->fresh());

        $this->getJson('/api/staff/orders')->assertOk()->assertJsonCount(1, 'data');
    }

    public function test_ordering_is_refused_until_a_name_and_phone_are_on_file(): void
    {
        $user = User::factory()->incompleteProfile()->create();
        $address = $user->addresses()->create([
            'line' => 'Nizami küçəsi 1',
            'delivery_zone_id' => self::ZONE,
            'is_default' => true,
        ]);

        Sanctum::actingAs($user);

        $this->postJson('/api/orders', $this->orderPayload($address, ['smoked-salmon' => 1]))
            ->assertStatus(422)
            ->assertJsonValidationErrors('profile');
    }
}
