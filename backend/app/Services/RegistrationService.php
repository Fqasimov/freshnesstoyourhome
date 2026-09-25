<?php

namespace App\Services;

use App\Models\User;
use App\Support\BlindIndex;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

/**
 * Sign-up and password reset for the app, both finished by an emailed code.
 *
 * Nothing is written to the users table until the code has been typed back.
 * Until then the form sits in the cache under a ticket only the device that
 * filled it in holds, and runs out with the code. An address nobody can read
 * never becomes an account, and a half-finished sign-up leaves no trace.
 *
 * Why a ticket and not just the address: the code proves the mailbox, the
 * ticket proves which form it confirms. Without it, someone who knows you are
 * signing up could send their own form for your address a moment later, and
 * the code you type would set *their* password on your account. With it, each
 * form is confirmed only from the device that sent it.
 *
 * The answer to starting is the same whether the address already has an
 * account or not. When it does, finishing the flow simply sets the new
 * password — the person has just proved they own the address, which is all a
 * password reset ever asks.
 */
class RegistrationService
{
    public const REGISTER = 'register';
    public const RESET = 'reset';

    public function __construct(private readonly LoginCodeService $codes) {}

    /**
     * Hold the form and send the code. Returns the ticket.
     *
     * @param  array{name?: string, date_of_birth?: string, password: string, locale?: string}  $form
     */
    public function start(string $purpose, string $email, array $form, ?string $ip): string
    {
        $email = BlindIndex::normaliseEmail($email);
        $ticket = Str::random(48);

        Cache::put($this->key($ticket), [
            'purpose' => $purpose,
            'email' => $email,
            'name' => $form['name'] ?? null,
            'date_of_birth' => $form['date_of_birth'] ?? null,
            // Hashed now, so the plain password never rests anywhere.
            'password' => Hash::make($form['password']),
            'locale' => $form['locale'] ?? 'az',
            'attempts' => 0,
        ], now()->addMinutes((int) config('freshness.auth.code_ttl_minutes')));

        // Throttled inside; a refusal is not reported, for the same reason the
        // plain sign-in does not report one.
        $this->codes->issue($email, $ip, $form['locale'] ?? 'az');

        return $ticket;
    }

    /**
     * Check the code and create (or update) the account. Null on any failure.
     *
     * @return array{user: User, created: bool}|null
     */
    public function confirm(string $ticket, string $email, string $code): ?array
    {
        $key = $this->key($ticket);
        $pending = Cache::get($key);

        if (! is_array($pending) || ! hash_equals($pending['email'], BlindIndex::normaliseEmail($email))) {
            return null;
        }

        // The code itself has an attempt count; this one stops a ticket from
        // being tried against a fresh code after the old one is spent.
        if ($pending['attempts'] >= (int) config('freshness.auth.max_attempts')) {
            Cache::forget($key);

            return null;
        }

        if (! $this->codes->consume($pending['email'], $code)) {
            $pending['attempts']++;
            Cache::put($key, $pending, now()->addMinutes((int) config('freshness.auth.code_ttl_minutes')));

            return null;
        }

        Cache::forget($key);

        return DB::transaction(function () use ($pending) {
            $user = User::findByEmail($pending['email']);

            if ($user !== null && $user->isBlocked()) {
                return null;
            }

            if ($user === null && $pending['purpose'] === self::RESET) {
                // Nobody to reset. Safe to say so: the caller has just proved
                // they read this mailbox.
                return null;
            }

            $created = $user === null;
            $user ??= new User(['email' => $pending['email'], 'locale' => $pending['locale']]);

            if ($pending['purpose'] === self::REGISTER) {
                $user->name = $pending['name'];
                $user->date_of_birth = $pending['date_of_birth'];
            }

            // Already a hash; the `hashed` cast recognises one and keeps it.
            $user->password = $pending['password'];
            $user->email_verified_at ??= now();
            $user->last_login_at = now();
            $user->save();

            if (! $created) {
                // A new password ends every session the old one opened.
                $user->tokens()->delete();
            }

            return ['user' => $user, 'created' => $created];
        });
    }

    /**
     * Email and password. Null for a wrong password, an unknown address, an
     * account that never set a password, and a blocked one — all alike.
     */
    public function attempt(string $email, string $password): ?User
    {
        $user = User::findByEmail($email);

        if ($user === null || ! $user->hasPassword()) {
            // Spend the same time as a real check, so the answer's speed does
            // not say whether the address has an account.
            Hash::check($password, '$2y$12$'.str_repeat('a', 53));

            return null;
        }

        if (! Hash::check($password, $user->password) || $user->isBlocked()) {
            return null;
        }

        $user->forceFill(['last_login_at' => now()])->save();

        return $user;
    }

    private function key(string $ticket): string
    {
        return 'signup:'.hash('sha256', $ticket);
    }
}
