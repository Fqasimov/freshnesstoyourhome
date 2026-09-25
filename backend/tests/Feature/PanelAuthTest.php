<?php

namespace Tests\Feature;

use App\Mail\LoginCodeMail;
use App\Models\AdminAudit;
use App\Models\LoginCode;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Mail;
use PragmaRX\Google2FA\Google2FA;
use Tests\TestCase;

/**
 * The admin panel's own sign-in.
 *
 * Only an address named in ADMIN_EMAILS gets anywhere, and only a token from
 * this sign-in opens the admin routes. Real bearer tokens throughout rather
 * than Sanctum::actingAs, because the token's ability is the thing under test.
 */
class PanelAuthTest extends TestCase
{
    use RefreshDatabase;

    private const ADMIN = 'info@freshnesstoyourhome.az';

    protected function setUp(): void
    {
        parent::setUp();

        config(['freshness.admin.emails' => [self::ADMIN]]);
        Mail::fake();
    }

    private function codeFor(string $email, string $endpoint = '/api/auth/panel/request-code'): ?string
    {
        $this->postJson($endpoint, ['email' => $email])->assertOk();

        $code = null;
        Mail::assertQueued(LoginCodeMail::class, function (LoginCodeMail $mail) use (&$code, $email) {
            if ($mail->hasTo($email)) {
                $code = $mail->code;
            }

            return true;
        });

        return $code;
    }

    /** The email step: returns the ticket and, when enrolling, the secret. */
    private function emailStep(): array
    {
        $code = $this->codeFor(self::ADMIN);

        return $this->postJson('/api/auth/panel/verify-code', ['email' => self::ADMIN, 'code' => $code])
            ->assertOk()
            ->json();
    }

    /** The code an authenticator app would show, $offset 30-second steps from now. */
    private function appCode(string $secret, int $offset = 0): string
    {
        return (new Google2FA)->oathTotp($secret, intdiv(time(), 30) + $offset);
    }

    private function secret(): string
    {
        return User::findByEmail(self::ADMIN)->two_factor_secret;
    }

    /** Both factors, enrolling on the way if needed. */
    private function panelToken(int $offset = 0): string
    {
        $step = $this->emailStep();

        return $this->postJson('/api/auth/panel/two-factor', [
            'ticket' => $step['ticket'],
            'code' => $this->appCode($this->secret(), $offset),
        ])->assertOk()->json('token');
    }

    private function fresh(): void
    {
        // One process serves every request here; without this the guard would
        // answer as whoever it resolved first.
        $this->app['auth']->forgetGuards();
    }

    public function test_a_stranger_typing_their_address_gets_nothing_at_all(): void
    {
        $named = $this->postJson('/api/auth/panel/request-code', ['email' => self::ADMIN])->assertOk()->json();
        $stranger = $this->postJson('/api/auth/panel/request-code', ['email' => 'someone@example.com'])->assertOk()->json();

        // Same answer, so the panel does not reveal which address is the admin's.
        $this->assertSame($named, $stranger);

        // …but no mail, no code and no account for the stranger.
        Mail::assertQueued(LoginCodeMail::class, 1);
        Mail::assertNotQueued(LoginCodeMail::class, fn ($m) => $m->hasTo('someone@example.com'));
        $this->assertSame(1, LoginCode::count());
        $this->assertNull(User::findByEmail('someone@example.com'));
    }

    public function test_the_named_address_signs_in_and_the_panel_opens(): void
    {
        $token = $this->panelToken();

        $this->withToken($token)->getJson('/api/admin/dashboard')->assertOk();
        $this->withToken($token)->getJson('/api/staff/orders')->assertOk();

        $user = User::findByEmail(self::ADMIN);
        $this->assertSame(User::ROLE_ADMIN, $user->role);
        $this->assertSame(['admin'], $user->tokens()->first()->abilities);

        // Recorded, and marked as coming from the server's configuration.
        $audit = AdminAudit::where('action', 'user.promote')->first();
        $this->assertSame('ADMIN_EMAILS', $audit->changes['via']);
        $this->assertSame(1, AdminAudit::where('action', 'admin.sign_in')->count());
    }

    // ------------------------------------------------------- two factor ---

    public function test_the_email_code_alone_is_not_a_session(): void
    {
        $step = $this->emailStep();

        $this->assertArrayNotHasKey('token', $step);
        $this->assertSame(0, User::findByEmail(self::ADMIN)->tokens()->count());
        $this->withToken($step['ticket'])->getJson('/api/admin/dashboard')->assertUnauthorized();
    }

    public function test_first_sign_in_enrols_the_app_and_hands_out_recovery_codes_once(): void
    {
        $step = $this->emailStep();

        $this->assertSame('enroll', $step['two_factor']);
        $this->assertMatchesRegularExpression('/^[A-Z2-7]{32}$/', $step['secret']);
        $this->assertStringStartsWith('otpauth://totp/', $step['otpauth']);

        $done = $this->postJson('/api/auth/panel/two-factor', [
            'ticket' => $step['ticket'],
            'code' => $this->appCode($step['secret']),
        ])->assertOk()->json();

        $this->assertCount(8, $done['recovery_codes']);
        $this->assertTrue(User::findByEmail(self::ADMIN)->hasTwoFactor());

        // Never readable again: stored hashed, and not in the next sign-in.
        $this->assertNotContains($done['recovery_codes'][0], User::findByEmail(self::ADMIN)->two_factor_recovery_codes);
        $this->fresh();
        $again = $this->emailStep();
        $this->assertSame('challenge', $again['two_factor']);
        $this->assertArrayNotHasKey('secret', $again);
    }

    public function test_an_unfinished_enrolment_is_forgotten_by_the_next_sign_in(): void
    {
        $first = $this->emailStep()['secret'];
        $this->fresh();
        $second = $this->emailStep()['secret'];

        $this->assertNotSame($first, $second);
        $this->assertNull(User::findByEmail(self::ADMIN)->two_factor_confirmed_at);
    }

    public function test_a_wrong_app_code_is_refused_and_the_ticket_runs_out(): void
    {
        $this->panelToken();
        $this->fresh();
        // Start from a clean rate-limit budget: this test is about the
        // ticket's own count, which must bite before the IP limit does.
        Cache::flush();
        $step = $this->emailStep();

        for ($i = 0; $i < 5; $i++) {
            $this->postJson('/api/auth/panel/two-factor', ['ticket' => $step['ticket'], 'code' => '000000'])
                ->assertStatus(422);
        }

        // Out of tries: even the right code no longer opens it.
        $this->postJson('/api/auth/panel/two-factor', [
            'ticket' => $step['ticket'],
            'code' => $this->appCode($this->secret(), 1),
        ])->assertStatus(422)->assertJsonMissingPath('token');
    }

    public function test_the_panel_door_rate_limits_per_ip(): void
    {
        for ($i = 0; $i < 10; $i++) {
            $this->postJson('/api/auth/panel/request-code', ['email' => "x{$i}@example.com"]);
        }

        $this->postJson('/api/auth/panel/request-code', ['email' => self::ADMIN])->assertStatus(429);
    }

    public function test_an_app_code_works_once(): void
    {
        $this->panelToken();
        $this->fresh();

        $code = $this->appCode($this->secret(), 1);
        $step = $this->emailStep();
        $this->postJson('/api/auth/panel/two-factor', ['ticket' => $step['ticket'], 'code' => $code])->assertOk();

        $this->fresh();
        $replay = $this->emailStep();
        $this->postJson('/api/auth/panel/two-factor', ['ticket' => $replay['ticket'], 'code' => $code])
            ->assertStatus(422);
    }

    public function test_a_recovery_code_gets_in_once_when_the_phone_is_lost(): void
    {
        $step = $this->emailStep();
        $codes = $this->postJson('/api/auth/panel/two-factor', [
            'ticket' => $step['ticket'],
            'code' => $this->appCode($step['secret']),
        ])->json('recovery_codes');

        $this->fresh();
        $in = $this->emailStep();
        $this->postJson('/api/auth/panel/two-factor', ['ticket' => $in['ticket'], 'recovery_code' => strtoupper($codes[3])])
            ->assertOk()->assertJsonPath('token', fn ($t) => is_string($t));
        $this->assertCount(7, User::findByEmail(self::ADMIN)->two_factor_recovery_codes);

        $this->fresh();
        $again = $this->emailStep();
        $this->postJson('/api/auth/panel/two-factor', ['ticket' => $again['ticket'], 'recovery_code' => $codes[3]])
            ->assertStatus(422);
    }

    public function test_a_recovery_code_cannot_stand_in_for_enrolment(): void
    {
        $step = $this->emailStep();

        $this->postJson('/api/auth/panel/two-factor', ['ticket' => $step['ticket'], 'recovery_code' => 'abcde-fghij'])
            ->assertStatus(422);
        $this->assertFalse(User::findByEmail(self::ADMIN)->hasTwoFactor());
    }

    public function test_a_ticket_is_dead_once_the_address_leaves_admin_emails(): void
    {
        $step = $this->emailStep();
        config(['freshness.admin.emails' => []]);

        $this->postJson('/api/auth/panel/two-factor', [
            'ticket' => $step['ticket'],
            'code' => $this->appCode($step['secret']),
        ])->assertStatus(422)->assertJsonMissingPath('token');
    }

    public function test_a_panel_session_lasts_a_working_day(): void
    {
        $this->panelToken();

        $expires = User::findByEmail(self::ADMIN)->tokens()->first()->expires_at;

        $this->assertTrue($expires->lessThanOrEqualTo(now()->addHours(12)->addMinute()));
        $this->assertTrue($expires->greaterThan(now()->addHours(11)));
    }

    /** The admin's phone, signed in to the shop, is not a way into the panel. */
    public function test_the_admins_own_shop_sign_in_does_not_open_the_panel(): void
    {
        $this->panelToken();
        $this->fresh();

        $code = $this->codeFor(self::ADMIN, '/api/auth/request-code');
        $shop = $this->postJson('/api/auth/verify-code', ['email' => self::ADMIN, 'code' => $code])
            ->assertOk()
            ->json('token');

        $this->fresh();
        $this->withToken($shop)->getJson('/api/me')->assertOk();
        $this->withToken($shop)->getJson('/api/admin/dashboard')->assertNotFound();
        $this->withToken($shop)->getJson('/api/staff/orders')->assertNotFound();
    }

    public function test_taking_the_address_out_of_admin_emails_closes_the_panel_at_once(): void
    {
        $token = $this->panelToken();
        $this->fresh();

        config(['freshness.admin.emails' => []]);

        $this->withToken($token)->getJson('/api/admin/dashboard')->assertNotFound();
    }

    public function test_a_valid_shop_code_for_an_unnamed_address_is_refused_by_the_panel(): void
    {
        $code = $this->codeFor('someone@example.com', '/api/auth/request-code');

        $this->postJson('/api/auth/panel/verify-code', ['email' => 'someone@example.com', 'code' => $code])
            ->assertStatus(422);

        // Not spent, not promoted, not given anything.
        $this->assertNull(User::findByEmail('someone@example.com'));
        $this->assertSame(0, AdminAudit::count());
    }

    public function test_an_admin_role_in_the_database_is_not_enough_on_its_own(): void
    {
        $admin = User::factory()->admin()->create(['email' => 'old-admin@example.com']);
        $token = $admin->createToken('panel', ['admin'])->plainTextToken;

        $this->withToken($token)->getJson('/api/admin/dashboard')->assertNotFound();
    }

    public function test_shop_tokens_are_never_wildcards(): void
    {
        $code = $this->codeFor('someone@example.com', '/api/auth/request-code');
        $this->postJson('/api/auth/verify-code', ['email' => 'someone@example.com', 'code' => $code])->assertOk();

        $this->assertSame(['customer'], User::findByEmail('someone@example.com')->tokens()->first()->abilities);
    }

    public function test_nobody_is_admin_when_admin_emails_is_empty(): void
    {
        config(['freshness.admin.emails' => []]);

        $this->postJson('/api/auth/panel/request-code', ['email' => self::ADMIN])->assertOk();

        Mail::assertNothingQueued();
    }
}
