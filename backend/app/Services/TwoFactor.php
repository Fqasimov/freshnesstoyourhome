<?php

namespace App\Services;

use App\Models\User;
use Illuminate\Support\Str;
use PragmaRX\Google2FA\Google2FA;

/**
 * The panel's second factor: a six-digit code from an authenticator app
 * (Google Authenticator, Microsoft Authenticator, 1Password, Aegis …), per
 * RFC 6238 — 30-second steps, SHA-1, the parameters every app understands.
 */
class TwoFactor
{
    private const ISSUER = 'Freshness To Your Home';

    /** How many recovery codes an enrolment hands out. */
    public const RECOVERY_CODES = 8;

    public function __construct(private readonly Google2FA $google2fa = new Google2FA) {}

    /**
     * A fresh secret for an admin who has not finished enrolling.
     *
     * Replaced on every attempt until confirmed, so a secret seen half-way
     * through — on a screen, in a screenshot — stops mattering the next time
     * anyone signs in.
     */
    public function begin(User $user): string
    {
        // 32 base32 characters: 160 bits, the size RFC 4226 recommends.
        $secret = $this->google2fa->generateSecretKey(32);

        $user->forceFill([
            'two_factor_secret' => $secret,
            'two_factor_confirmed_at' => null,
            'two_factor_recovery_codes' => null,
            'two_factor_last_step' => null,
        ])->save();

        return $secret;
    }

    public function otpauthUri(User $user, string $secret): string
    {
        return $this->google2fa->getQRCodeUrl(self::ISSUER, (string) $user->email, $secret);
    }

    /**
     * Check a code from the app, once.
     *
     * One step either side is accepted, for a phone clock a few seconds out.
     * The step that matched is remembered and nothing at or before it is
     * accepted again — so a code read over someone's shoulder, or replayed from
     * a captured request, is dead the moment it has been used.
     */
    public function check(User $user, string $code): bool
    {
        if ($user->two_factor_secret === null || ! preg_match('/^\d{6}$/', $code)) {
            return false;
        }

        $step = $this->google2fa->verifyKeyNewer(
            $user->two_factor_secret,
            $code,
            (int) ($user->two_factor_last_step ?? 0),
            1,
        );

        if ($step === false) {
            return false;
        }

        $user->forceFill(['two_factor_last_step' => $step])->save();

        return true;
    }

    /**
     * Mark the enrolment done and hand out recovery codes — once.
     *
     * @return list<string> the codes in plain text; only their hashes are kept
     */
    public function confirm(User $user): array
    {
        $codes = [];
        for ($i = 0; $i < self::RECOVERY_CODES; $i++) {
            $raw = Str::lower(Str::random(10));
            $codes[] = substr($raw, 0, 5).'-'.substr($raw, 5);
        }

        $user->forceFill([
            'two_factor_confirmed_at' => now(),
            'two_factor_recovery_codes' => array_map([$this, 'hashRecovery'], $codes),
        ])->save();

        return $codes;
    }

    /** Spend a recovery code. Each one works exactly once. */
    public function useRecoveryCode(User $user, string $code): bool
    {
        $hash = $this->hashRecovery($code);
        $left = $user->two_factor_recovery_codes ?? [];

        foreach ($left as $i => $stored) {
            if (hash_equals($stored, $hash)) {
                unset($left[$i]);
                $user->forceFill(['two_factor_recovery_codes' => array_values($left)])->save();

                return true;
            }
        }

        return false;
    }

    private function hashRecovery(string $code): string
    {
        return hash('sha256', strtolower(trim($code)));
    }
}
