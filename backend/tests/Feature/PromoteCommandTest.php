<?php

namespace Tests\Feature;

use App\Models\AdminAudit;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Appointing couriers.
 *
 * A console command rather than a screen, so that it needs access to the
 * server: if a role could ever be granted over HTTP, a stolen admin session
 * could mint a second admin that survives revoking the first. Admins are the
 * one role it will not grant — those are named in ADMIN_EMAILS, which needs
 * the same server access (see PanelAuthTest).
 */
class PromoteCommandTest extends TestCase
{
    use RefreshDatabase;

    public function test_it_promotes_an_existing_account(): void
    {
        $user = User::factory()->create(['email' => 'boss@example.com']);

        $this->artisan('freshness:promote boss@example.com courier')
            ->expectsConfirmation('Change boss@example.com from customer to courier?', 'yes')
            ->assertSuccessful();

        $this->assertSame(User::ROLE_COURIER, $user->fresh()->role);
    }

    /** An admin role from here would open nothing; ADMIN_EMAILS decides. */
    public function test_it_will_not_appoint_an_admin(): void
    {
        $user = User::factory()->create(['email' => 'boss@example.com']);

        $this->artisan('freshness:promote boss@example.com admin')
            ->expectsOutputToContain('ADMIN_EMAILS')
            ->assertFailed();

        $this->assertSame(User::ROLE_CUSTOMER, $user->fresh()->role);
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

        $this->artisan('freshness:promote boss@example.com courier')
            ->expectsConfirmation('Change boss@example.com from customer to courier?', 'yes')
            ->assertSuccessful();

        $audit = AdminAudit::where('action', 'user.promote')->first();

        $this->assertNotNull($audit);
        $this->assertSame($user->id, $audit->subject_id);
        $this->assertSame(['from' => 'customer', 'to' => 'courier'], $audit->changes['role']);
    }

    public function test_it_refuses_a_role_that_does_not_exist(): void
    {
        $user = User::factory()->create(['email' => 'boss@example.com']);

        $this->artisan('freshness:promote boss@example.com superuser')->assertFailed();

        $this->assertSame(User::ROLE_CUSTOMER, $user->fresh()->role);
    }

    public function test_it_refuses_an_address_with_no_account(): void
    {
        $this->artisan('freshness:promote nobody@example.com courier')->assertFailed();
    }

    public function test_declining_the_confirmation_changes_nothing(): void
    {
        $user = User::factory()->create(['email' => 'boss@example.com']);

        $this->artisan('freshness:promote boss@example.com courier')
            ->expectsConfirmation('Change boss@example.com from customer to courier?', 'no')
            ->assertFailed();

        $this->assertSame(User::ROLE_CUSTOMER, $user->fresh()->role);
        $this->assertSame(0, AdminAudit::count());
    }
}
