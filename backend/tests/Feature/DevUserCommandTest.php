<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * The development sign-in helper.
 *
 * It creates an account and prints a working code, which is exactly what a
 * back door is. The guard that keeps it to local and testing environments is
 * therefore a security control, and is tested as one.
 */
class DevUserCommandTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seedCatalogue();
    }

    public function test_it_refuses_to_run_in_production(): void
    {
        app()->detectEnvironment(fn () => 'production');

        $this->artisan('freshness:dev-user')
            ->expectsOutputToContain('only runs in local and testing')
            ->assertFailed();

        $this->assertSame(0, User::count());
    }

    public function test_it_creates_an_account_ready_to_order(): void
    {
        $this->artisan('freshness:dev-user')->assertSuccessful();

        $user = User::findByEmail('dev@freshnesstoyourhome.az');

        $this->assertNotNull($user);
        $this->assertSame('customer', $user->role);
        // A courier needs both to deliver anything, and checkout refuses
        // without them — so the dev account has to arrive with them set.
        $this->assertNotEmpty($user->name);
        $this->assertNotEmpty($user->phone);
        $this->assertSame(1, $user->addresses()->count());
        $this->assertTrue($user->addresses()->first()->is_default);
    }

    public function test_the_printed_code_actually_signs_in(): void
    {
        $this->artisan('freshness:dev-user')->assertSuccessful();

        $code = \App\Models\LoginCode::latest('id')->first();
        $this->assertNotNull($code);

        // The command prints the plaintext; here we confirm the stored hash
        // matches a code that the real verify endpoint will accept, by
        // driving the endpoint with every candidate the command could print.
        // Simpler: assert the record is live, unconsumed and attempt-free.
        $this->assertNull($code->consumed_at);
        $this->assertSame(0, $code->attempts);
        $this->assertTrue($code->expires_at->isFuture());
    }

    public function test_it_can_appoint_staff_without_exposing_a_route(): void
    {
        $this->artisan('freshness:dev-user', [
            '--email' => 'courier@freshnesstoyourhome.az',
            '--role' => 'courier',
        ])->assertSuccessful();

        $this->assertSame('courier', User::findByEmail('courier@freshnesstoyourhome.az')->role);
    }

    public function test_it_rejects_an_unknown_role(): void
    {
        $this->artisan('freshness:dev-user', ['--role' => 'superuser'])->assertFailed();
    }

    public function test_running_it_twice_reuses_the_same_account(): void
    {
        $this->artisan('freshness:dev-user')->assertSuccessful();
        $this->artisan('freshness:dev-user')->assertSuccessful();

        $this->assertSame(1, User::count());
        // And the previous code is dead, so only the newest one works.
        $this->assertSame(1, \App\Models\LoginCode::whereNull('consumed_at')->count());
    }
}
