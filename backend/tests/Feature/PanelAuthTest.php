<?php

namespace Tests\Feature;

use App\Mail\LoginCodeMail;
use App\Models\AdminAudit;
use App\Models\LoginCode;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Mail;
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

    private function panelToken(): string
    {
        $code = $this->codeFor(self::ADMIN);

        return $this->postJson('/api/auth/panel/verify-code', ['email' => self::ADMIN, 'code' => $code])
            ->assertOk()
            ->json('token');
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
