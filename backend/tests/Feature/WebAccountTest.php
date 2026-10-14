<?php

namespace Tests\Feature;

use App\Models\Order;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Accounts on the website: the same accounts as the app, optional for
 * ordering, needed for tracking. A guest's order can be claimed into an
 * account from the browser that placed it.
 */
class WebAccountTest extends TestCase
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

    private function tokenFor(User $user, array $abilities = ['customer']): string
    {
        return $user->createToken('web', $abilities)->plainTextToken;
    }

    public function test_a_guest_order_needs_no_account_and_gets_a_claim_token(): void
    {
        $res = $this->postJson('/api/orders/web', $this->webOrder())->assertCreated()->json();

        $this->assertFalse($res['signed_in']);
        $this->assertSame(48, strlen($res['claim_token']));
        $order = Order::findOrFail($res['id']);
        $this->assertNull($order->user_id);
        // Only a hash is kept.
        $this->assertSame(hash('sha256', $res['claim_token']), $order->claim_token_hash);
    }

    public function test_a_signed_in_website_order_goes_on_the_account(): void
    {
        $user = User::factory()->create();

        $res = $this->withToken($this->tokenFor($user))
            ->postJson('/api/orders/web', $this->webOrder())->assertCreated()->json();

        $this->assertTrue($res['signed_in']);
        $this->assertNull($res['claim_token']);
        $this->assertSame($user->id, Order::findOrFail($res['id'])->user_id);

        // And the account sees it, here and in the app alike.
        $this->app['auth']->forgetGuards();
        $this->withToken($this->tokenFor($user))->getJson('/api/orders')
            ->assertOk()->assertJsonPath('data.0.id', $res['id'])->assertJsonPath('data.0.source', 'web');
    }

    public function test_a_panel_token_does_not_put_an_order_on_an_account(): void
    {
        $admin = User::factory()->admin()->create();

        $res = $this->withToken($this->tokenFor($admin, ['admin']))
            ->postJson('/api/orders/web', $this->webOrder())->assertCreated()->json();

        $this->assertNull(Order::findOrFail($res['id'])->user_id);
        $this->assertNotNull($res['claim_token']);
    }

    public function test_a_guest_order_is_claimed_once_by_the_account_that_presents_the_token(): void
    {
        $res = $this->postJson('/api/orders/web', $this->webOrder())->assertCreated()->json();

        $user = User::factory()->create();
        $this->withToken($this->tokenFor($user))
            ->postJson('/api/orders/claim', ['token' => $res['claim_token']])
            ->assertOk()->assertJsonPath('order.code', $res['code']);

        $order = Order::findOrFail($res['id']);
        $this->assertSame($user->id, $order->user_id);
        $this->assertNull($order->claim_token_hash);

        // Spent: nobody else can take it with the same token.
        $other = User::factory()->create();
        $this->app['auth']->forgetGuards();
        $this->withToken($this->tokenFor($other))
            ->postJson('/api/orders/claim', ['token' => $res['claim_token']])
            ->assertNotFound();
        $this->assertSame($user->id, $order->fresh()->user_id);
    }

    public function test_a_wrong_or_expired_token_claims_nothing(): void
    {
        $res = $this->postJson('/api/orders/web', $this->webOrder())->assertCreated()->json();
        $user = User::factory()->create();

        $this->withToken($this->tokenFor($user))
            ->postJson('/api/orders/claim', ['token' => str_repeat('a', 48)])->assertNotFound();

        Order::whereKey($res['id'])->update(['claim_expires_at' => now()->subMinute()]);
        $this->app['auth']->forgetGuards();
        $this->withToken($this->tokenFor($user))
            ->postJson('/api/orders/claim', ['token' => $res['claim_token']])->assertNotFound();

        $this->assertNull(Order::findOrFail($res['id'])->user_id);
    }

    public function test_claiming_needs_an_account(): void
    {
        $this->postJson('/api/orders/claim', ['token' => str_repeat('a', 48)])->assertUnauthorized();
    }
}
