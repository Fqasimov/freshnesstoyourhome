<?php

namespace App\Services;

use App\Mail\LoginCodeMail;
use App\Models\LoginCode;
use App\Models\User;
use App\Support\BlindIndex;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\RateLimiter;

/**
 * Passwordless sign-in.
 *
 * There is no password anywhere in this system. A customer types their email,
 * receives a six-digit code, and types it back. That removes password reuse,
 * password reset, credential stuffing and the storage of a password hash worth
 * stealing — and replaces them with one problem to get right: making the code
 * hard to guess and expensive to farm.
 *
 * Four defences do that work:
 *
 *  - The code is stored only as a bcrypt hash, so a database copy does not
 *    yield live codes.
 *  - Wrong guesses are counted and the code dies after `max_attempts`. Six
 *    digits is a million possibilities; five tries makes the odds 1 in 200,000
 *    per code, and the code is dead either way within minutes.
 *  - Issuing a code is throttled per address, per IP, and globally. Without
 *    the last one, this endpoint is a free mail cannon pointed at strangers,
 *    sent from our domain and charged to our reputation.
 *  - The response never says whether an account exists. Otherwise the endpoint
 *    is an oracle for "is this person a customer here", which is exactly the
 *    kind of question a leak lets someone answer about a stranger.
 */
class LoginCodeService
{
    public const TOO_MANY = 'too_many';
    public const SENT = 'sent';

    /**
     * Issue and email a code.
     *
     * Returns self::SENT or self::TOO_MANY. Callers must respond identically
     * for an address that exists and one that does not.
     */
    public function issue(string $email, ?string $ip, string $locale = 'az'): string
    {
        $email = BlindIndex::normaliseEmail($email);
        $hash = BlindIndex::ofEmail($email);

        if (! $this->withinLimits($hash, $ip)) {
            return self::TOO_MANY;
        }

        $code = $this->generateCode();

        DB::transaction(function () use ($email, $hash, $code, $ip): void {
            // Only one code may be live at a time. Without this, asking for a
            // second code leaves the first one valid, and every resend widens
            // the window an attacker is guessing into.
            LoginCode::where('email_hash', $hash)
                ->whereNull('consumed_at')
                ->update(['consumed_at' => now()]);

            LoginCode::create([
                'email_hash' => $hash,
                'email' => $email,
                'code_hash' => Hash::make($code),
                'expires_at' => now()->addMinutes((int) config('freshness.auth.code_ttl_minutes')),
                'request_ip' => $ip,
            ]);
        });

        // Queued: sending inline would make the endpoint's response time vary
        // with whether the address exists in our mail provider's records.
        Mail::to($email)->queue(new LoginCodeMail($code, $locale));

        return self::SENT;
    }

    /**
     * Check a code and return the customer it belongs to.
     *
     * Creates the account on first successful verification — a correct code
     * proves control of the address, which is the whole of what registration
     * needs to establish. Returns null for any failure, without distinguishing
     * "wrong code" from "expired" from "never issued": each of those is a fact
     * about somebody else's account that a guesser should not learn.
     */
    public function verify(string $email, string $code): ?User
    {
        $email = BlindIndex::normaliseEmail($email);

        if (! $this->consume($email, $code)) {
            return null;
        }

        return $this->resolveUser($email);
    }

    /**
     * Check and spend a code, without touching any account.
     *
     * True only for the live code of that address, typed correctly, within
     * its attempts. Registration uses this directly: the account it creates
     * carries the details from the sign-up form, which verify() knows nothing
     * about.
     */
    public function consume(string $email, string $code): bool
    {
        $email = BlindIndex::normaliseEmail($email);

        $record = LoginCode::usableFor($email)->latest('id')->first();

        if ($record === null || $record->isExhausted()) {
            return false;
        }

        if (! Hash::check($code, $record->code_hash)) {
            // Count the miss before returning, so a client that keeps guessing
            // runs the code out instead of getting unlimited tries.
            $record->increment('attempts');

            return false;
        }

        // Single use. Marked consumed in the same statement that checks it is
        // still unconsumed, so two requests racing with the same correct code
        // cannot both succeed.
        $claimed = LoginCode::where('id', $record->id)
            ->whereNull('consumed_at')
            ->update(['consumed_at' => now()]);

        return $claimed === 1;
    }

    private function resolveUser(string $email): ?User
    {
        $user = User::findByEmail($email);

        if ($user === null) {
            // Registration. Name and phone are collected afterwards, on the
            // profile screen, and are required before an order can be placed —
            // a courier with no phone number cannot deliver anything.
            $user = new User(['email' => $email, 'locale' => 'az']);
            $user->email_verified_at = now();
            $user->last_login_at = now();
            $user->save();

            return $user;
        }

        // A blocked account must not be able to sign in. Checked here rather
        // than at the route, so there is no second path that misses it.
        if ($user->isBlocked()) {
            return null;
        }

        $user->forceFill([
            'email_verified_at' => $user->email_verified_at ?? now(),
            'last_login_at' => now(),
        ])->save();

        return $user;
    }

    /**
     * Three independent budgets, all of which must have room.
     *
     * They answer different attacks: the per-address one stops someone
     * mailbombing a specific person, the per-IP one stops a single client
     * harvesting many addresses, and the global one caps the blast radius when
     * an attacker has many IPs — the case the first two cannot see.
     */
    private function withinLimits(string $emailHash, ?string $ip): bool
    {
        $limits = config('freshness.auth.throttle');

        $budgets = [
            ['otp:email:'.$emailHash, (int) $limits['per_email_hourly']],
            ['otp:ip:'.sha1((string) $ip), (int) $limits['per_ip_hourly']],
            ['otp:global', (int) $limits['global_hourly']],
        ];

        foreach ($budgets as [$key, $max]) {
            if (RateLimiter::tooManyAttempts($key, $max)) {
                return false;
            }
        }

        // Only spend from the budgets once every one of them has room, so a
        // request refused by the last check does not silently consume the
        // earlier ones.
        foreach ($budgets as [$key, $max]) {
            RateLimiter::hit($key, 3600);
        }

        return true;
    }

    /**
     * A uniformly random six-digit code, leading zeros included.
     *
     * random_int() is the CSPRNG; rand() and mt_rand() are predictable from a
     * handful of outputs, which for a login code means forgeable.
     */
    private function generateCode(): string
    {
        $length = (int) config('freshness.auth.code_length');

        return str_pad((string) random_int(0, (10 ** $length) - 1), $length, '0', STR_PAD_LEFT);
    }
}
