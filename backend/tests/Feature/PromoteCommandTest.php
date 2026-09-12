<?php

namespace Tests\Feature;

use App\Models\AdminAudit;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Appointing staff.
 *
 * This is the only path in the whole system that changes a role, and it is a
 * console command rather than a screen so that it needs access to the server.
 * That property is worth a test: if a role could ever be granted over HTTP, a
 * stolen admin session could mint a second admin that survives revoking the
 * first.
 */
class PromoteCommandTest extends TestCase
{
    use RefreshDatabase;

    public function test_it_promotes_an_existing_account(): void
    {
        $user = User::factory()->create(['email' => 'boss@example.com']);

        $this->artisan('freshness:promote boss@example.com admin')
            ->expectsConfirmation('Change boss@example.com from customer to admin?', 'yes')
            ->assertSuccessful();

        $this->assertSame(User::ROLE_ADMIN, $user->fresh()->role);
    }

    /** Every token they hold was issued to the role they had before. */
    public function test_it_signs_the_account_out_everywhere(): void
    {
        $user = User::factory()->create(['email' => 'boss@example.com']);
        $user->createToken('phone');

        $this->artisan('freshness:promote boss@example.com courier')
            ->expectsConfirmation('Change boss@example.com from customer to courier?', 'yes')
            ->assertSuccessful();

        $this->assertSame(0, $user->tokens()->count());
    }

    public function test_it_records_the_change(): void
    {
        $user = User::factory()->create(['email' => 'boss@example.com']);

        $this->artisan('freshness:promote boss@example.com admin')
            ->expectsConfirmation('Change boss@example.com from customer to admin?', 'yes')
            ->assertSuccessful();

        $audit = AdminAudit::where('action', 'user.promote')->first();

        $this->assertNotNull($audit);
        $this->assertSame($user->id, $audit->subject_id);
        $this->assertSame(['from' => 'customer', 'to' => 'admin'], $audit->changes['role']);
    }

    public function test_it_refuses_a_role_that_does_not_exist(): void
    {
        $user = User::factory()->create(['email' => 'boss@example.com']);

        $this->artisan('freshness:promote boss@example.com superuser')->assertFailed();

        $this->assertSame(User::ROLE_CUSTOMER, $user->fresh()->role);
    }

    public function test_it_refuses_an_address_with_no_account(): void
    {
        $this->artisan('freshness:promote nobody@example.com admin')->assertFailed();
    }

    public function test_declining_the_confirmation_changes_nothing(): void
    {
        $user = User::factory()->create(['email' => 'boss@example.com']);

        $this->artisan('freshness:promote boss@example.com admin')
            ->expectsConfirmation('Change boss@example.com from customer to admin?', 'no')
            ->assertFailed();

        $this->assertSame(User::ROLE_CUSTOMER, $user->fresh()->role);
        $this->assertSame(0, AdminAudit::count());
    }
}
