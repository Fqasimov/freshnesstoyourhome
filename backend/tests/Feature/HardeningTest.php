<?php

namespace Tests\Feature;

use App\Mail\LoginCodeMail;
use App\Mail\SignInBudgetAlarm;
use App\Models\PushToken;
use App\Models\User;
use App\Providers\AppServiceProvider;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Str;
use Tests\TestCase;

/**
 * Ways to keep somebody out, or to bury the shop, that cost an attacker
 * almost nothing — each one closed, and each test written as the attack.
 */
class HardeningTest extends TestCase
{
    use RefreshDatabase;

    private const ADMIN = 'info@freshnesstoyourhome.az';

    protected function setUp(): void
    {
        parent::setUp();

        config(['freshness.admin.emails' => [self::ADMIN]]);
        Mail::fake();
    }

    private function fromIp(string $ip): static
    {
        return $this->withServerVariables(['REMOTE_ADDR' => $ip]);
    }

    /** The newest code mailed to an address. */
    private function lastCodeTo(string $email): ?string
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

    private function codesMailedTo(string $email): int
    {
        return Mail::queued(LoginCodeMail::class, fn (LoginCodeMail $m) => $m->hasTo($email))->count();
    }

    // ------------------------------------------------- the admin's door ---

    public function test_a_stranger_asking_for_codes_cannot_kill_the_admins_code(): void
    {
        $ticket = $this->fromIp('1.1.1.1')->postJson('/api/auth/panel/request-code', ['email' => self::ADMIN])->json('request');
        $code = $this->lastCodeTo(self::ADMIN);

        // Someone who knows the admin's (public) address keeps asking.
        foreach (['6.6.6.1', '6.6.6.2', '6.6.6.3'] as $ip) {
            $this->fromIp($ip)->postJson('/api/auth/panel/request-code', ['email' => self::ADMIN])->assertOk();
        }

        $this->fromIp('1.1.1.1')
            ->postJson('/api/auth/panel/verify-code', ['request' => $ticket, 'email' => self::ADMIN, 'code' => $code])
            ->assertOk()->assertJsonStructure(['ticket']);
    }

    public function test_a_panel_code_works_only_with_the_ticket_it_was_sent_for(): void
    {
        $this->postJson('/api/auth/panel/request-code', ['email' => self::ADMIN]);
        $code = $this->lastCodeTo(self::ADMIN);

        $this->postJson('/api/auth/panel/verify-code', ['email' => self::ADMIN, 'code' => $code])->assertStatus(422);
        $this->postJson('/api/auth/panel/verify-code', ['request' => Str::random(40), 'email' => self::ADMIN, 'code' => $code])
            ->assertStatus(422);
    }

    public function test_flooding_the_panel_door_from_one_source_does_not_lock_the_admin_out(): void
    {
        // Ten requests every ten minutes used to shut the panel for everyone.
        for ($i = 0; $i < 12; $i++) {
            $this->fromIp('6.6.6.6')->postJson('/api/auth/panel/request-code', ['email' => self::ADMIN]);
        }
        $this->fromIp('6.6.6.6')->postJson('/api/auth/panel/request-code', ['email' => self::ADMIN])->assertStatus(429);

        $before = $this->codesMailedTo(self::ADMIN);
        $this->fromIp('1.1.1.1')->postJson('/api/auth/panel/request-code', ['email' => self::ADMIN])->assertOk();
        $this->assertSame($before + 1, $this->codesMailedTo(self::ADMIN));
    }

    public function test_before_two_factor_is_set_up_the_admins_codes_keep_the_tight_budget(): void
    {
        // Without the app, a guessed email code would lead to enrolment —
        // the whole panel — so more codes an hour would mean more chances.
        $max = (int) config('freshness.auth.throttle.per_email_hourly');

        for ($i = 0; $i < $max + 3; $i++) {
            $this->fromIp("7.7.7.{$i}")->postJson('/api/auth/panel/request-code', ['email' => self::ADMIN])->assertOk();
        }

        $this->assertSame($max, $this->codesMailedTo(self::ADMIN));
    }

    public function test_once_two_factor_is_set_up_strangers_cannot_spend_the_admins_codes_quickly(): void
    {
        User::factory()->admin()->create([
            'email' => self::ADMIN,
            'two_factor_secret' => 'JBSWY3DPEHPK3PXP',
            'two_factor_confirmed_at' => now(),
        ]);
        $tight = (int) config('freshness.auth.throttle.per_email_hourly');

        for ($i = 0; $i < $tight + 3; $i++) {
            $this->fromIp("7.7.8.{$i}")->postJson('/api/auth/panel/request-code', ['email' => self::ADMIN])->assertOk();
        }

        // Past the tight budget, and the admin still gets a code.
        $this->assertSame($tight + 3, $this->codesMailedTo(self::ADMIN));
        $this->fromIp('1.1.1.1')->postJson('/api/auth/panel/request-code', ['email' => self::ADMIN])->assertOk();
        $this->assertSame($tight + 4, $this->codesMailedTo(self::ADMIN));
    }

    // ---------------------------------------------- customers' sign-in ---

    public function test_a_strangers_code_request_does_not_kill_a_sign_up_in_progress(): void
    {
        $form = [
            'name' => 'Nicat Məmmədov', 'email' => 'nicat@example.com', 'date_of_birth' => '1995-04-12',
            'password' => 'Fresh-fish1', 'password_confirmation' => 'Fresh-fish1',
        ];
        $ticket = $this->fromIp('1.1.1.1')->postJson('/api/auth/register', $form)->assertOk()->json('ticket');
        $code = $this->lastCodeTo('nicat@example.com');

        $this->fromIp('6.6.6.6')->postJson('/api/auth/request-code', ['email' => 'nicat@example.com'])->assertOk();

        $this->fromIp('1.1.1.1')
            ->postJson('/api/auth/confirm', ['ticket' => $ticket, 'email' => 'nicat@example.com', 'code' => $code])
            ->assertCreated();
    }

    public function test_wrong_guesses_from_elsewhere_do_not_stop_the_owner_typing_their_code(): void
    {
        $ticket = $this->fromIp('1.1.1.1')->postJson('/api/auth/request-code', ['email' => 'owner@example.com'])->json('request');
        $code = $this->lastCodeTo('owner@example.com');

        // Enough to trip a per-address limiter, all from one stranger.
        for ($i = 0; $i < 7; $i++) {
            $this->fromIp('6.6.6.6')->postJson('/api/auth/verify-code', ['email' => 'owner@example.com', 'code' => '000000']);
        }

        $this->fromIp('1.1.1.1')
            ->postJson('/api/auth/verify-code', ['request' => $ticket, 'email' => 'owner@example.com', 'code' => $code])
            ->assertOk();
    }

    public function test_filling_the_budget_with_made_up_addresses_does_not_stop_existing_customers(): void
    {
        config(['freshness.auth.throttle.global_hourly' => 3]);
        User::factory()->create(['email' => 'regular@example.com']);

        for ($i = 0; $i < 5; $i++) {
            $this->fromIp("8.8.8.{$i}")->postJson('/api/auth/request-code', ['email' => "nobody{$i}@example.com"])->assertOk();
        }
        $this->assertSame(0, $this->codesMailedTo('nobody4@example.com'));

        $this->fromIp('1.1.1.1')->postJson('/api/auth/request-code', ['email' => 'regular@example.com'])->assertOk();
        $this->assertSame(1, $this->codesMailedTo('regular@example.com'));
    }

    public function test_a_full_budget_alerts_the_admins_once_an_hour(): void
    {
        config(['freshness.auth.throttle.global_hourly' => 1]);
        Log::spy();

        for ($i = 0; $i < 4; $i++) {
            $this->fromIp("9.9.9.{$i}")->postJson('/api/auth/request-code', ['email' => "x{$i}@example.com"]);
        }

        Log::shouldHaveReceived('critical')->once();
        Mail::assertSent(SignInBudgetAlarm::class, 1);
        Mail::assertSent(SignInBudgetAlarm::class, fn ($m) => $m->hasTo(self::ADMIN));
    }

    // ------------------------------------------------- burying the shop ---

    public function test_website_orders_have_a_ceiling_for_the_whole_day(): void
    {
        $this->seedCatalogue();
        config(['freshness.order.web_daily_cap' => 2]);
        $order = [
            'lines' => [['product_id' => 'smoked-salmon', 'qty' => 1]], 'zone_id' => self::ZONE,
            'contact_name' => 'Aysel', 'contact_phone' => '+994 50 123 45 67', 'address_line' => 'Nizami küçəsi 10',
        ];

        $this->fromIp('2.2.2.1')->postJson('/api/orders/web', $order)->assertCreated();
        $this->fromIp('2.2.2.2')->postJson('/api/orders/web', $order)->assertCreated();
        $this->fromIp('2.2.2.3')->postJson('/api/orders/web', $order)->assertStatus(429);
    }

    public function test_signed_in_routes_are_rate_limited(): void
    {
        $this->signInAs(User::factory()->create());

        for ($i = 0; $i < 60; $i++) {
            $this->getJson('/api/me')->assertOk();
        }
        $this->getJson('/api/me')->assertStatus(429);
    }

    public function test_an_account_cannot_save_addresses_without_end(): void
    {
        $this->seedCatalogue();
        $user = $this->signInAs(User::factory()->create());
        $address = ['line' => 'Nizami küçəsi 10', 'delivery_zone_id' => self::ZONE];

        for ($i = 0; $i < 20; $i++) {
            $this->postJson('/api/addresses', $address)->assertCreated();
        }
        $this->postJson('/api/addresses', $address)->assertStatus(422);
        $this->assertSame(20, $user->addresses()->count());
    }

    public function test_an_account_keeps_only_its_most_recent_devices(): void
    {
        $user = $this->signInAs(User::factory()->create());

        for ($i = 0; $i < 12; $i++) {
            $this->travel(1)->minutes();
            $this->postJson('/api/push-tokens', ['token' => "ExponentPushToken[device{$i}]"])->assertCreated();
        }

        $kept = $user->pushTokens()->pluck('token');
        $this->assertCount(10, $kept);
        $this->assertNotContains('ExponentPushToken[device0]', $kept);
        $this->assertContains('ExponentPushToken[device11]', $kept);
        $this->assertSame(10, PushToken::count());
    }

    // ------------------------------------------------------- the server ---

    public function test_the_catalogue_may_be_kept_by_the_edge_for_a_minute(): void
    {
        $this->seedCatalogue();

        $cache = $this->getJson('/api/catalogue')->assertOk()->headers->get('Cache-Control');

        $this->assertStringContainsString('public', $cache);
        $this->assertStringContainsString('s-maxage=60', $cache);
        $this->assertStringNotContainsString('private', $cache);
    }

    public function test_a_protected_route_without_a_token_is_a_401_not_a_crash(): void
    {
        // No Accept: application/json, as a browser or a scanner sends it.
        foreach (['/api/me', '/api/orders', '/api/staff/orders', '/api/admin/dashboard'] as $path) {
            $this->get($path)->assertStatus(401);
        }
    }

    public function test_production_complains_loudly_about_codes_written_to_the_log(): void
    {
        Log::spy();
        $this->app['env'] = 'production';
        config(['app.debug' => false, 'mail.default' => 'log']);

        (new AppServiceProvider($this->app))->boot();

        Log::shouldHaveReceived('critical')->withArgs(fn ($message) => str_contains($message, 'MAIL_MAILER'))->once();
    }
}
