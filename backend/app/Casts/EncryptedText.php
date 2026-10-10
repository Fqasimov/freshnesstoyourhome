<?php

namespace App\Casts;

use Illuminate\Contracts\Database\Eloquent\CastsAttributes;
use Illuminate\Contracts\Encryption\DecryptException;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Crypt;

/**
 * Text encrypted at rest under APP_KEY, that still reads what was written
 * before it was encrypted.
 *
 * Laravel's own `encrypted` cast throws on a value that is not ciphertext. For
 * a column that already holds plain text in production, that turns the minutes
 * between uploading this code and running the migration that encrypts the old
 * rows into an error on every order that has one. This cast reads such a value
 * as it is and writes every new one encrypted; the migration then closes the
 * gap, and `freshness:reencrypt` keeps the column honest after a key change.
 */
class EncryptedText implements CastsAttributes
{
    public function get(Model $model, string $key, mixed $value, array $attributes): ?string
    {
        if ($value === null || $value === '') {
            return $value;
        }

        try {
            return Crypt::decryptString($value);
        } catch (DecryptException) {
            return $value;
        }
    }

    public function set(Model $model, string $key, mixed $value, array $attributes): ?string
    {
        if ($value === null || $value === '') {
            return $value;
        }

        return Crypt::encryptString((string) $value);
    }
}
