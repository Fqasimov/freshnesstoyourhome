<?php

namespace App\Support;

use Illuminate\Support\Facades\Config;
use RuntimeException;

/**
 * Keyed lookup hashes for encrypted columns.
 *
 * Encrypting a column makes it unsearchable: two encryptions of the same email
 * produce different ciphertext, so `where('email', ...)` can never match. The
 * standard answer is a blind index — store a keyed hash of the normalised
 * value beside the ciphertext, look up by the hash, decrypt for display.
 *
 * Three things matter here:
 *
 * - It is an HMAC, not a bare hash. A plain sha256 of an email address is
 *   trivially reversible by guessing addresses; without the key, an HMAC is
 *   not.
 * - The key is NOT the application key. If it were, one leaked value would
 *   cost both confidentiality and searchability. It lives in its own env var.
 * - Normalisation happens before hashing, or the same address in different
 *   case produces two accounts.
 */
final class BlindIndex
{
    public static function ofEmail(string $email): string
    {
        return self::hash('email:'.self::normaliseEmail($email));
    }

    public static function ofPhone(string $phone): string
    {
        return self::hash('phone:'.self::normalisePhone($phone));
    }

    /** A Google or Apple account id ("sub"), looked up without being stored. */
    public static function ofProvider(string $provider, string $subject): string
    {
        return self::hash('provider:'.$provider.':'.$subject);
    }

    public static function normaliseEmail(string $email): string
    {
        // Lowercase the whole address. The local part is technically
        // case-sensitive per RFC 5321, but no mail provider a customer will
        // use treats it that way, and honouring it would let one person
        // register Ali@ and ali@ as separate accounts.
        return mb_strtolower(trim($email));
    }

    /**
     * Normalise an Azerbaijani mobile number to E.164 (+994XXXXXXXXX).
     *
     * Customers type +994 50 123 45 67, 050 123 45 67, and 0501234567 for the
     * same phone. Without this, one customer has three accounts' worth of
     * phone numbers and the courier calls the wrong one.
     */
    public static function normalisePhone(string $phone): string
    {
        $digits = preg_replace('/\D+/', '', $phone) ?? '';

        // 0XXXXXXXXX -> 994XXXXXXXXX (national trunk prefix)
        if (str_starts_with($digits, '0') && strlen($digits) === 10) {
            return '994'.substr($digits, 1);
        }

        // Bare subscriber number, no country and no trunk code.
        if (strlen($digits) === 9) {
            return '994'.$digits;
        }

        return $digits;
    }

    private static function hash(string $value): string
    {
        return hash_hmac('sha256', $value, self::key());
    }

    private static function key(): string
    {
        $key = Config::get('freshness.blind_index_key');

        if (! is_string($key) || $key === '') {
            throw new RuntimeException(
                'BLIND_INDEX_KEY is not set. Generate one with '.
                '`php artisan freshness:generate-keys` and put it in .env. '.
                'It must differ from APP_KEY, and changing it orphans every '.
                'existing lookup hash.'
            );
        }

        return $key;
    }
}
