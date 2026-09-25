<?php

namespace Tests\Feature;

use App\Mail\LoginCodeMail;
use App\Models\User;
use Firebase\JWT\JWT;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Mail;
use Tests\TestCase;

/**
 * The app's accounts: sign up with a password, confirm by emailed code,
 * sign in, reset, Google and Apple, and deletion.
 */
class AccountAuthTest extends TestCase
{
    use RefreshDatabase;

    private const PASSWORD = 'Fresh-fish1';

    protected function setUp(): void
    {
        parent::setUp();
        Mail::fake();
    }

    private function form(array $overrides = []): array
    {
        return array_merge([
            'name' => 'Nicat Məmmədov',
            'email' => 'nicat@example.com',
            'date_of_birth' => '1995-04-12',
            'password' => self::PASSWORD,
            'password_confirmation' => self::PASSWORD,
            'locale' => 'az',
        ], $overrides);
    }

    /** The last code mailed to an address. */
    private function mailedCode(string $email): string
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

    private function signUp(array $overrides = []): array
    {
        $form = $this->form($overrides);
        $ticket = $this->postJson('/api/auth/register', $form)->assertOk()->json('ticket');

        return [$form, $ticket];
    }

    public function test_no_account_exists_until_the_code_is_typed_back(): void
    {
        [$form, $ticket] = $this->signUp();

        $this->assertSame(0, User::count());
        $this->assertNull(User::findByEmail($form['email']));

        $res = $this->postJson('/api/auth/confirm', [
            'ticket' => $ticket, 'email' => $form['email'], 'code' => $this->mailedCode($form['email']),
        ])->assertCreated();

        $user = User::findByEmail($form['email']);
        $this->assertNotNull($user);
        $this->assertSame('Nicat Məmmədov', $user->name);
        $this->assertSame('1995-04-12', $user->date_of_birth);
        $this->assertNotNull($user->email_verified_at);
        $this->assertTrue($user->hasPassword());
        $this->assertNotSame(self::PASSWORD, $user->getRawOriginal('password'));
        $this->assertSame(['customer'], $user->tokens()->first()->abilities);
        $this->assertTrue($res->json('user.has_password'));
    }

    public function test_a_wrong_code_creates_nothing(): void
    {
        [$form, $ticket] = $this->signUp();
        $right = $this->mailedCode($form['email']);
        $wrong = $right === '000000' ? '111111' : '000000';

        $this->postJson('/api/auth/confirm', ['ticket' => $ticket, 'email' => $form['email'], 'code' => $wrong])
            ->assertStatus(422);

        $this->assertSame(0, User::count());
    }

    public function test_the_code_confirms_only_the_form_from_the_same_device(): void
    {
        // You start signing up; a moment later someone else sends a form for
        // your address with their own password.
        [$form, $mine] = $this->signUp();
        $this->signUp(['password' => 'Attacker-1x', 'password_confirmation' => 'Attacker-1x']);
        $code = $this->mailedCode($form['email']);

        // A made-up ticket gets nowhere, code or not.
        $this->postJson('/api/auth/confirm', ['ticket' => str_repeat('x', 48), 'email' => $form['email'], 'code' => $code])
            ->assertStatus(422);
        $this->assertSame(0, User::count());

        // You type the code on your own phone: your form is the one confirmed.
        $this->postJson('/api/auth/confirm', ['ticket' => $mine, 'email' => $form['email'], 'code' => $code])
            ->assertCreated();

        $this->postJson('/api/auth/login', ['email' => $form['email'], 'password' => 'Attacker-1x'])->assertStatus(422);
        $this->postJson('/api/auth/login', ['email' => $form['email'], 'password' => self::PASSWORD])->assertOk();
    }

    public function test_the_password_rules_are_enforced(): void
    {
        foreach (['short1!A', 'alllowercase1!', 'ALLUPPERCASE1!', 'NoDigits!!', 'NoSymbol123'] as $i => $bad) {
            $pw = $i === 0 ? 'Sh1!a' : $bad;
            $this->postJson('/api/auth/register', $this->form(['password' => $pw, 'password_confirmation' => $pw]))
                ->assertStatus(422)->assertJsonValidationErrors('password');
        }

        $this->postJson('/api/auth/register', $this->form(['password_confirmation' => 'Different-1']))
            ->assertStatus(422)->assertJsonValidationErrors('password');
    }

    public function test_a_child_cannot_open_an_account(): void
    {
        $this->postJson('/api/auth/register', $this->form(['date_of_birth' => now()->subYears(10)->toDateString()]))
            ->assertStatus(422)->assertJsonValidationErrors('date_of_birth');
    }

    public function test_sign_in_with_email_and_password(): void
    {
        [$form, $ticket] = $this->signUp();
        $this->postJson('/api/auth/confirm', ['ticket' => $ticket, 'email' => $form['email'], 'code' => $this->mailedCode($form['email'])]);

        $this->postJson('/api/auth/login', ['email' => 'NICAT@example.com', 'password' => self::PASSWORD])
            ->assertOk()
            ->assertJsonPath('user.name', 'Nicat Məmmədov')
            ->assertJsonStructure(['token']);

        $wrong = $this->postJson('/api/auth/login', ['email' => $form['email'], 'password' => 'Nope-12345'])
            ->assertStatus(422)->json('message');
        $unknown = $this->postJson('/api/auth/login', ['email' => 'nobody@example.com', 'password' => 'Nope-12345'])
            ->assertStatus(422)->json('message');

        // One answer for both, so the form does not reveal who has an account.
        $this->assertSame($wrong, $unknown);
    }

    public function test_password_guessing_is_rate_limited_per_address(): void
    {
        User::factory()->create(['email' => 'target@example.com']);

        for ($i = 0; $i < 10; $i++) {
            $this->withServerVariables(['REMOTE_ADDR' => "10.0.0.{$i}"])
                ->postJson('/api/auth/login', ['email' => 'target@example.com', 'password' => "Guess-{$i}x!"]);
        }

        $this->withServerVariables(['REMOTE_ADDR' => '10.0.1.1'])
            ->postJson('/api/auth/login', ['email' => 'target@example.com', 'password' => 'Guess-last!1'])
            ->assertStatus(429);
    }

    public function test_a_forgotten_password_is_reset_by_the_code_and_old_sessions_end(): void
    {
        $user = User::factory()->create(['email' => 'old@example.com']);
        $old = $user->createToken('phone', ['customer'])->plainTextToken;

        $ticket = $this->postJson('/api/auth/password/forgot', [
            'email' => 'old@example.com', 'password' => 'Brand-new1!', 'password_confirmation' => 'Brand-new1!',
        ])->assertOk()->json('ticket');

        $this->postJson('/api/auth/confirm', ['ticket' => $ticket, 'email' => 'old@example.com', 'code' => $this->mailedCode('old@example.com')])
            ->assertOk();

        $this->app['auth']->forgetGuards();
        $this->withToken($old)->getJson('/api/me')->assertUnauthorized();
        $this->postJson('/api/auth/login', ['email' => 'old@example.com', 'password' => 'Brand-new1!'])->assertOk();
    }

    public function test_a_reset_for_an_unknown_address_creates_nothing(): void
    {
        $ticket = $this->postJson('/api/auth/password/forgot', [
            'email' => 'ghost@example.com', 'password' => 'Brand-new1!', 'password_confirmation' => 'Brand-new1!',
        ])->assertOk()->json('ticket');

        $this->postJson('/api/auth/confirm', ['ticket' => $ticket, 'email' => 'ghost@example.com', 'code' => $this->mailedCode('ghost@example.com')])
            ->assertStatus(422);

        $this->assertSame(0, User::count());
    }

    public function test_a_blocked_account_cannot_sign_in_with_its_password(): void
    {
        $user = User::factory()->create(['email' => 'b@example.com']);
        $user->forceFill(['password' => 'Fresh-fish1', 'blocked_at' => now()])->save();

        $this->postJson('/api/auth/login', ['email' => 'b@example.com', 'password' => 'Fresh-fish1'])->assertStatus(422);
    }

    // ------------------------------------------------------------ social ---

    private array $rsa;

    private function provider(string $name, string $aud): void
    {
        $key = openssl_pkey_new(['private_key_bits' => 2048, 'private_key_type' => OPENSSL_KEYTYPE_RSA]);
        openssl_pkey_export($key, $pem);
        $d = openssl_pkey_get_details($key)['rsa'];
        $b64 = fn ($v) => rtrim(strtr(base64_encode($v), '+/', '-_'), '=');

        $this->rsa = ['pem' => $pem];
        config(["freshness.social.{$name}" => [$aud]]);
        Cache::flush();

        Http::fake([
            '*' => Http::response(['keys' => [[
                'kty' => 'RSA', 'alg' => 'RS256', 'use' => 'sig', 'kid' => 'k1',
                'n' => $b64($d['n']), 'e' => $b64($d['e']),
            ]]]),
        ]);
    }

    private function idToken(array $claims): string
    {
        return JWT::encode(array_merge(['iat' => time(), 'exp' => time() + 600], $claims), $this->rsa['pem'], 'RS256', 'k1');
    }

    public function test_google_sign_in_creates_the_account_once_and_signs_in_after(): void
    {
        $this->provider('google', 'web-client.apps.googleusercontent.com');
        $token = $this->idToken([
            'iss' => 'https://accounts.google.com', 'aud' => 'web-client.apps.googleusercontent.com',
            'sub' => '1234567890', 'email' => 'g@example.com', 'email_verified' => true, 'name' => 'Faiq Fərid',
        ]);

        $this->postJson('/api/auth/social/google', ['id_token' => $token])->assertCreated()
            ->assertJsonPath('user.name', 'Faiq Fərid');
        $this->postJson('/api/auth/social/google', ['id_token' => $token])->assertOk();

        $this->assertSame(1, User::count());
        $this->assertNotNull(User::first()->google_id_hash);
    }

    public function test_google_sign_in_joins_the_existing_account_with_that_address(): void
    {
        $user = User::factory()->create(['email' => 'same@example.com']);
        $this->provider('google', 'web-client');

        $this->postJson('/api/auth/social/google', ['id_token' => $this->idToken([
            'iss' => 'accounts.google.com', 'aud' => 'web-client', 'sub' => 'abc', 'email' => 'same@example.com', 'email_verified' => true,
        ])])->assertOk()->assertJsonPath('user.id', $user->id);
    }

    public function test_a_token_for_another_app_or_unverified_address_is_refused(): void
    {
        $this->provider('google', 'our-client');

        $this->postJson('/api/auth/social/google', ['id_token' => $this->idToken([
            'iss' => 'accounts.google.com', 'aud' => 'somebody-elses-client', 'sub' => 'x', 'email' => 'x@example.com', 'email_verified' => true,
        ])])->assertStatus(422);

        $this->postJson('/api/auth/social/google', ['id_token' => $this->idToken([
            'iss' => 'accounts.google.com', 'aud' => 'our-client', 'sub' => 'y', 'email' => 'y@example.com', 'email_verified' => false,
        ])])->assertStatus(422);

        $this->postJson('/api/auth/social/google', ['id_token' => $this->idToken([
            'iss' => 'https://evil.example', 'aud' => 'our-client', 'sub' => 'z', 'email' => 'z@example.com', 'email_verified' => true,
        ])])->assertStatus(422);

        $this->assertSame(0, User::count());
    }

    public function test_apple_sign_in_takes_the_name_from_the_app(): void
    {
        $this->provider('apple', 'az.freshnesstoyourhome.app');

        $this->postJson('/api/auth/social/apple', [
            'id_token' => $this->idToken([
                'iss' => 'https://appleid.apple.com', 'aud' => 'az.freshnesstoyourhome.app',
                'sub' => '001.apple', 'email' => 'relay@privaterelay.appleid.com', 'email_verified' => 'true',
            ]),
            'name' => 'Nicat M',
        ])->assertCreated()->assertJsonPath('user.name', 'Nicat M');
    }

    public function test_social_sign_in_is_off_until_configured(): void
    {
        config(['freshness.social.google' => []]);

        $this->postJson('/api/auth/social/google', ['id_token' => 'x'])->assertStatus(503);
    }

    // ---------------------------------------------------------- deletion ---

    public function test_deleting_an_account_with_no_orders_removes_the_row(): void
    {
        $user = User::factory()->create();
        $this->signInAs($user);

        $this->deleteJson('/api/me')->assertOk();

        $this->assertNull(User::find($user->id));
    }
}
