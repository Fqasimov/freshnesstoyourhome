<?php

namespace Tests\Feature;

use App\Models\LoginCode;
use App\Models\User;
use App\Support\BlindIndex;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/**
 * The sign-in flow, attacked.
 *
 * Passwordless removes a whole category of problem and concentrates the
 * remainder into one place: a six-digit code. These tests are that place.
 */
class AuthSecurityTest extends TestCase
{
    use RefreshDatabase;

    /** Pull the code out of the mail the service queued. */
    private function issueCodeFor(string $email): string
    {
        Mail::fake();

        $this->postJson('/api/auth/request-code', ['email' => $email])->assertOk();

        $sent = null;
        Mail::assertQueued(\App\Mail\LoginCodeMail::class, function ($mail) use (&$sent) {
            $sent = $mail->code;

            return true;
        });

        return $sent;
    }

    public function test_the_code_is_never_stored_in_the_clear(): void
    {
        $code = $this->issueCodeFor('customer@example.com');

        $row = DB::table('login_codes')->first();

        $this->assertNotSame($code, $row->code_hash);
        $this->assertStringNotContainsString($code, $row->code_hash);
        // And it is a slow hash, so a leaked table does not yield live codes.
        $this->assertTrue(Hash::check($code, $row->code_hash));
    }

    public function test_the_email_is_encrypted_and_only_findable_by_blind_index(): void
    {
        $this->issueCodeFor('customer@example.com');

        $row = DB::table('login_codes')->first();

        $this->assertStringNotContainsString('customer@example.com', $row->email);
        $this->assertSame(BlindIndex::ofEmail('customer@example.com'), $row->email_hash);
    }

    public function test_a_wrong_code_is_refused_and_burns_an_attempt(): void
    {
        $this->issueCodeFor('customer@example.com');

        $this->postJson('/api/auth/verify-code', [
            'email' => 'customer@example.com',
            'code' => '000000',
        ])->assertStatus(422);

        $this->assertSame(1, LoginCode::first()->attempts);
    }

    public function test_a_code_dies_after_the_attempt_cap_even_if_the_next_guess_is_right(): void
    {
        $code = $this->issueCodeFor('customer@example.com');
        $max = (int) config('freshness.auth.max_attempts');

        for ($i = 0; $i < $max; $i++) {
            $this->postJson('/api/auth/verify-code', [
                'email' => 'customer@example.com',
                'code' => str_pad((string) $i, 6, '9'),
            ])->assertStatus(422);
        }

        // The correct code, arriving one guess too late.
        $this->postJson('/api/auth/verify-code', [
            'email' => 'customer@example.com',
            'code' => $code,
        ])->assertStatus(422);

        $this->assertSame(0, User::count());
    }

    public function test_a_code_cannot_be_used_twice(): void
    {
        $code = $this->issueCodeFor('customer@example.com');

        $this->postJson('/api/auth/verify-code', [
            'email' => 'customer@example.com',
            'code' => $code,
        ])->assertOk();

        $this->postJson('/api/auth/verify-code', [
            'email' => 'customer@example.com',
            'code' => $code,
        ])->assertStatus(422);
    }

    public function test_an_expired_code_is_refused(): void
    {
        $code = $this->issueCodeFor('customer@example.com');

        $this->travel((int) config('freshness.auth.code_ttl_minutes') + 1)->minutes();

        $this->postJson('/api/auth/verify-code', [
            'email' => 'customer@example.com',
            'code' => $code,
        ])->assertStatus(422);
    }

    public function test_asking_for_a_second_code_kills_the_first(): void
    {
        $first = $this->issueCodeFor('customer@example.com');
        $second = $this->issueCodeFor('customer@example.com');

        $this->assertNotSame($first, $second);

        $this->postJson('/api/auth/verify-code', [
            'email' => 'customer@example.com',
            'code' => $first,
        ])->assertStatus(422);

        $this->postJson('/api/auth/verify-code', [
            'email' => 'customer@example.com',
            'code' => $second,
        ])->assertOk();
    }

    public function test_the_response_does_not_reveal_whether_an_account_exists(): void
    {
        User::factory()->create(['email' => 'known@example.com']);

        Mail::fake();

        $known = $this->postJson('/api/auth/request-code', ['email' => 'known@example.com']);
        $unknown = $this->postJson('/api/auth/request-code', ['email' => 'stranger@example.com']);

        $known->assertOk();
        $unknown->assertOk();
        $this->assertSame($known->json(), $unknown->json());
    }

    public function test_a_correct_code_registers_a_new_customer(): void
    {
        $code = $this->issueCodeFor('newcomer@example.com');

        $response = $this->postJson('/api/auth/verify-code', [
            'email' => 'newcomer@example.com',
            'code' => $code,
        ])->assertOk();

        $this->assertNotEmpty($response->json('token'));
        // Registered, but not yet able to order: no name, no phone.
        $this->assertFalse($response->json('user.profile_complete'));
        $this->assertSame('customer', User::first()->role);
    }

    public function test_a_case_variant_of_an_address_signs_into_the_same_account(): void
    {
        $user = User::factory()->create(['email' => 'person@example.com']);

        $code = $this->issueCodeFor('PERSON@Example.COM');

        $response = $this->postJson('/api/auth/verify-code', [
            'email' => 'person@example.com',
            'code' => $code,
        ])->assertOk();

        $this->assertSame($user->id, $response->json('user.id'));
        $this->assertSame(1, User::count());
    }

    public function test_a_blocked_account_cannot_sign_in(): void
    {
        User::factory()->blocked()->create(['email' => 'banned@example.com']);

        $code = $this->issueCodeFor('banned@example.com');

        $this->postJson('/api/auth/verify-code', [
            'email' => 'banned@example.com',
            'code' => $code,
        ])->assertStatus(422);
    }

    public function test_a_blocked_account_cannot_use_a_token_issued_earlier(): void
    {
        $user = User::factory()->create();
        $this->signInAs($user);

        $this->getJson('/api/me')->assertOk();

        $user->forceFill(['blocked_at' => now()])->save();

        $this->getJson('/api/me')->assertStatus(401);
    }

    public function test_protected_routes_reject_an_anonymous_caller(): void
    {
        foreach ([['get', '/api/me'], ['get', '/api/orders'], ['get', '/api/addresses']] as [$method, $path]) {
            $this->json($method, $path)->assertStatus(401);
        }
    }
}
