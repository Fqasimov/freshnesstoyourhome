<?php

namespace Tests\Feature;

use App\Models\AdminAudit;
use App\Models\Bundle;
use App\Models\DeliveryZone;
use App\Models\Product;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/**
 * The admin panel's API.
 *
 * Two things are being tested here and they matter in different ways. The
 * first is that an edit works and reaches customers — a price changed in the
 * panel and still stale in the app is the whole feature failing quietly. The
 * second is that the panel cannot do the things it must never do: a courier
 * cannot edit prices, nobody can grant themselves a role, and no edit happens
 * without a line in the audit trail saying who made it.
 */
class AdminPanelTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seedCatalogue();
    }

    private function admin(): User
    {
        $user = User::factory()->create();
        $user->promote(User::ROLE_ADMIN);

        return $user->fresh();
    }

    // ------------------------------------------------------------ access ---

    /**
     * 404 rather than 403, which is the existing convention in EnsureRole: a
     * customer poking at /api/admin should not learn that the route is there
     * and that they are merely the wrong kind of person to use it.
     */
    public function test_a_customer_cannot_reach_the_admin_api(): void
    {
        $this->signInAs(User::factory()->create());

        $this->getJson('/api/admin/dashboard')->assertNotFound();
        $this->getJson('/api/admin/products')->assertNotFound();
        $this->patchJson('/api/admin/products/smoked-salmon', ['price_minor' => 1])->assertNotFound();
    }

    /**
     * A courier moves orders and weighs goods. That is the whole job, and it
     * is deliberately not the same set of doors as the price list.
     */
    public function test_a_courier_can_work_orders_but_cannot_edit_the_price_list(): void
    {
        $courier = User::factory()->create();
        $courier->promote(User::ROLE_COURIER);
        $this->signInAs($courier->fresh());

        $this->getJson('/api/staff/orders')->assertOk();
        $this->getJson('/api/admin/products')->assertNotFound();
        $this->patchJson('/api/admin/products/smoked-salmon', ['price_minor' => 1])->assertNotFound();
    }

    public function test_the_admin_api_is_closed_to_anonymous_callers(): void
    {
        $this->getJson('/api/admin/dashboard')->assertUnauthorized();
    }

    public function test_a_blocked_admin_is_locked_out(): void
    {
        $admin = $this->admin();
        $admin->forceFill(['blocked_at' => now()])->save();
        $this->signInAs($admin->fresh());

        // 401 from the `blocked` middleware, which runs before the role check
        // and also destroys whatever tokens the account still holds.
        $this->getJson('/api/admin/dashboard')->assertUnauthorized();
    }

    // ----------------------------------------------------------- pricing ---

    public function test_a_price_edit_reaches_the_public_catalogue_immediately(): void
    {
        // Warm the cache first: the bug this guards against only appears on
        // the second read, when a stale payload is served from it.
        $this->getJson('/api/catalogue')->assertOk();

        $this->signInAs($this->admin());

        $this->patchJson('/api/admin/products/smoked-salmon', ['price_minor' => 6_150])
            ->assertOk()
            ->assertJsonPath('price_minor', 6_150);

        $public = collect($this->getJson('/api/catalogue')->json('products'))
            ->firstWhere('id', 'smoked-salmon');

        $this->assertSame(6_150, $public['price_minor']);
    }

    public function test_taking_a_product_out_of_stock_removes_it_from_the_catalogue(): void
    {
        $this->signInAs($this->admin());

        $this->patchJson('/api/admin/products/smoked-salmon', ['in_stock' => false])->assertOk();

        $ids = collect($this->getJson('/api/catalogue')->json('products'))->pluck('id');
        $this->assertNotContains('smoked-salmon', $ids);

        // And it is still listed in the panel — the row you most need to edit
        // is the one customers cannot see.
        $adminIds = collect($this->getJson('/api/admin/products')->json('data'))->pluck('id');
        $this->assertContains('smoked-salmon', $adminIds);
    }

    public function test_a_nonsense_price_is_refused(): void
    {
        $this->signInAs($this->admin());

        $this->patchJson('/api/admin/products/smoked-salmon', ['price_minor' => 0])
            ->assertStatus(422);
        $this->patchJson('/api/admin/products/smoked-salmon', ['price_minor' => 99_000_000])
            ->assertStatus(422);
        $this->patchJson('/api/admin/products/smoked-salmon', ['price_minor' => 'free'])
            ->assertStatus(422);
    }

    public function test_a_whole_shelf_can_be_taken_out_at_once(): void
    {
        $this->signInAs($this->admin());

        $ids = Product::query()->limit(3)->pluck('id')->all();

        $this->postJson('/api/admin/products/stock', ['ids' => $ids, 'in_stock' => false])
            ->assertOk()
            ->assertJsonCount(3, 'updated');

        $this->assertSame(3, Product::whereIn('id', $ids)->where('in_stock', false)->count());
    }

    // ----------------------------------------------------------- bundles ---

    public function test_switching_a_bundle_on_puts_it_on_the_website(): void
    {
        $this->signInAs($this->admin());

        $bundle = Bundle::first();
        $this->assertFalse($bundle->is_active, 'Bundles must ship switched off.');

        $this->patchJson("/api/admin/bundles/{$bundle->id}", ['is_active' => true])
            ->assertOk()
            ->assertJsonPath('is_active', true)
            ->assertJsonPath('shown_on_site', true);

        $this->assertContains(
            $bundle->id,
            collect($this->getJson('/api/catalogue')->json('bundles'))->pluck('id')->all(),
        );
    }

    public function test_a_bundle_discount_cannot_be_set_to_give_the_goods_away(): void
    {
        $this->signInAs($this->admin());

        $bundle = Bundle::first();

        $this->patchJson("/api/admin/bundles/{$bundle->id}", ['discount_percent' => 95])
            ->assertStatus(422);
    }

    public function test_the_panel_prices_a_bundle_rather_than_trusting_the_client(): void
    {
        $this->signInAs($this->admin());

        $bundle = Bundle::with('items.product')->first();
        $expected = (int) $bundle->items->sum(fn ($i) => $i->product->price_minor * $i->qty);

        $body = collect($this->getJson('/api/admin/bundles')->json('data'))
            ->firstWhere('id', $bundle->id);

        $this->assertSame($expected, $body['full_minor']);
        $this->assertSame(
            (int) round($expected * (100 - $bundle->discount_percent) / 100),
            $body['price_minor'],
        );
    }

    // ------------------------------------------------------------- zones ---

    public function test_a_delivery_fee_set_here_is_charged_on_the_next_basket(): void
    {
        $this->signInAs($this->admin());

        // Deliberately not the seeded fee: a patch that sets a value to what
        // it already was proves nothing.
        $this->patchJson('/api/admin/zones/'.self::ZONE, ['fee_minor' => 850])->assertOk();

        $fee = collect($this->getJson('/api/catalogue')->json('zones'))
            ->firstWhere('id', self::ZONE)['fee_minor'];

        $this->assertSame(850, $fee);
    }

    // --------------------------------------------------------- customers ---

    public function test_the_customer_list_does_not_hand_over_every_address(): void
    {
        $customer = User::factory()->create(['email' => 'someone@example.com']);
        $this->signInAs($this->admin());

        $row = collect($this->getJson('/api/admin/customers')->json('data'))
            ->firstWhere('id', $customer->id);

        $this->assertArrayNotHasKey('email', $row);
        $this->assertStringNotContainsString('someone@', $row['email_masked']);
        $this->assertStringContainsString('@example.com', $row['email_masked']);
    }

    public function test_looking_at_one_customer_in_full_is_recorded(): void
    {
        $customer = User::factory()->create(['email' => 'someone@example.com']);
        $this->signInAs($this->admin());

        $this->getJson("/api/admin/customers/{$customer->id}")
            ->assertOk()
            ->assertJsonPath('email', 'someone@example.com');

        $this->assertDatabaseHas('admin_audits', [
            'action' => 'customer.view',
            'subject_id' => $customer->id,
        ]);
    }

    public function test_blocking_a_customer_ends_their_session_now(): void
    {
        $customer = User::factory()->create();
        $customerToken = $customer->createToken('phone')->plainTextToken;

        // Real bearer tokens on both sides rather than Sanctum::actingAs. The
        // acting-as helper replaces the guard for the rest of the test, so the
        // revoked token would keep "working" and this test would pass without
        // testing anything.
        $admin = $this->admin();
        config(['freshness.admin.emails' => [$admin->email]]);
        $adminToken = $admin->createToken('panel', ['admin'])->plainTextToken;

        $this->withHeader('Authorization', "Bearer {$adminToken}")
            ->postJson("/api/admin/customers/{$customer->id}/block", ['blocked' => true])
            ->assertOk();

        $this->assertNotNull($customer->fresh()->blocked_at);
        $this->assertSame(0, $customer->tokens()->count());

        // One test process serves both requests, and the auth guard caches the
        // user it resolved the first time. Without this the second request
        // would answer as the admin and the test would pass while proving
        // nothing. A real deployment gets a fresh guard per request.
        $this->app['auth']->forgetGuards();

        $this->withHeader('Authorization', "Bearer {$customerToken}")
            ->getJson('/api/me')
            ->assertUnauthorized();
    }

    public function test_an_admin_cannot_block_staff_or_themselves(): void
    {
        $admin = $this->admin();
        $other = User::factory()->create();
        $other->promote(User::ROLE_COURIER);

        $this->signInAs($admin);

        $this->postJson("/api/admin/customers/{$admin->id}/block", ['blocked' => true])->assertStatus(422);
        $this->postJson("/api/admin/customers/{$other->id}/block", ['blocked' => true])->assertStatus(422);
    }

    /**
     * There is no route that changes a role, and there must never be one: an
     * admin session that leaks could otherwise mint a second admin that
     * outlives revoking the first.
     */
    public function test_no_admin_route_can_appoint_staff(): void
    {
        $admin = $this->admin();
        $customer = User::factory()->create();
        $this->signInAs($admin);

        foreach ([
            ["/api/admin/customers/{$customer->id}/block", ['blocked' => false, 'role' => 'admin']],
        ] as [$url, $payload]) {
            $this->postJson($url, $payload);
        }

        $this->assertSame(User::ROLE_CUSTOMER, $customer->fresh()->role);

        $routes = collect(app('router')->getRoutes()->getRoutes())
            ->filter(fn ($r) => str_starts_with($r->uri(), 'api/admin'))
            ->map(fn ($r) => $r->uri().'|'.$r->getActionName());

        $this->assertEmpty(
            $routes->filter(fn (string $r) => str_contains(strtolower($r), 'promote') || str_contains(strtolower($r), 'role')),
            'An admin route that touches roles has appeared.',
        );
    }

    // ------------------------------------------------------------- audit ---

    public function test_every_edit_records_who_made_it_and_what_moved(): void
    {
        $admin = $this->admin();
        $this->signInAs($admin);

        $before = Product::find('smoked-salmon')->price_minor;
        $this->patchJson('/api/admin/products/smoked-salmon', ['price_minor' => 4_242])->assertOk();

        $audit = AdminAudit::where('action', 'product.update')->latest('id')->first();

        $this->assertNotNull($audit);
        $this->assertSame($admin->id, $audit->actor_id);
        $this->assertSame(User::ROLE_ADMIN, $audit->actor_role);
        $this->assertSame('smoked-salmon', $audit->subject_id);
        $this->assertSame(['from' => $before, 'to' => 4_242], $audit->changes['price_minor']);
    }

    public function test_an_edit_that_changes_nothing_writes_no_audit_line(): void
    {
        $this->signInAs($this->admin());

        $price = Product::find('smoked-salmon')->price_minor;
        $this->patchJson('/api/admin/products/smoked-salmon', ['price_minor' => $price])->assertOk();

        $this->assertSame(0, AdminAudit::where('action', 'product.update')->count());
    }

    public function test_the_audit_trail_is_read_only(): void
    {
        $this->signInAs($this->admin());
        $this->patchJson('/api/admin/products/smoked-salmon', ['price_minor' => 4_242])->assertOk();

        $id = AdminAudit::latest('id')->first()->id;

        // No route exists to change or remove one. Asserting on the router
        // rather than on a 404 means this keeps holding when routes are added.
        $verbs = collect(app('router')->getRoutes()->getRoutes())
            ->filter(fn ($r) => str_contains($r->uri(), 'audit'))
            ->flatMap(fn ($r) => $r->methods())
            ->unique()
            ->values()
            ->all();

        $this->assertSame(['GET', 'HEAD'], $verbs);
        $this->assertDatabaseHas('admin_audits', ['id' => $id]);
    }

    // --------------------------------------------------------- dashboard ---

    public function test_the_dashboard_counts_what_the_shop_asks_in_the_morning(): void
    {
        $this->signInAs($this->admin());

        Product::query()->limit(2)->update(['in_stock' => false]);

        $body = $this->getJson('/api/admin/dashboard')->assertOk()->json();

        $this->assertSame(2, $body['catalogue']['out_of_stock']);
        $this->assertSame(0, $body['catalogue']['bundles_active']);
        $this->assertArrayHasKey('placed', $body['orders']['by_status']);
        $this->assertArrayHasKey('today_minor', $body['revenue']);
    }
}
