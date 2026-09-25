<?php

namespace App\Support;

use App\Models\User;

/**
 * The one definition of "may use the admin panel".
 *
 * Three things, all required:
 *
 *  - the address is in ADMIN_EMAILS on the server (config/freshness.php);
 *  - the account holds the admin role;
 *  - the request carries a token issued by the panel's own sign-in, which is
 *    the only place the `admin` ability is ever granted.
 *
 * The third is what keeps the shop app out. The admin's own address can sign
 * in to the shop on a phone like anyone else, and that phone keeps a sixty-day
 * token — which buys a basket and an order history, never the price list. A
 * lost phone is not a lost admin panel.
 */
class AdminAccess
{
    public const ABILITY = 'admin';

    public static function isNamed(string $email): bool
    {
        return self::namesHash(BlindIndex::ofEmail($email));
    }

    public static function granted(?User $user): bool
    {
        return $user !== null
            && ! $user->isBlocked()
            && $user->isAdmin()
            && $user->tokenCan(self::ABILITY)
            && self::namesHash((string) $user->email_hash);
    }

    /** Compared by blind index, so the account's address is never decrypted. */
    private static function namesHash(string $hash): bool
    {
        foreach (config('freshness.admin.emails', []) as $named) {
            if (hash_equals(BlindIndex::ofEmail($named), $hash)) {
                return true;
            }
        }

        return false;
    }
}
