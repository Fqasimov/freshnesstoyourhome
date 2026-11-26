<?php

namespace App\Casts;

use Illuminate\Contracts\Database\Eloquent\CastsAttributes;
use Illuminate\Database\Eloquent\Model;

/**
 * The journal's {field: {from, to}} as JSON, stored exactly as it was sealed.
 *
 * Laravel's plain "array" cast writes 10.0 as 10, so a whole-number float
 * (a 10% discount, a 2 kg unit) came back as an integer and no longer
 * matched the hash it was sealed with: the journal then reported itself as
 * altered when nothing had touched it. Keeping the ".0" keeps the value
 * identical on the way back. See App\Support\Audit::seal.
 */
final class AuditChanges implements CastsAttributes
{
    public function get(Model $model, string $key, mixed $value, array $attributes): ?array
    {
        return $value === null ? null : json_decode((string) $value, true);
    }

    public function set(Model $model, string $key, mixed $value, array $attributes): ?string
    {
        return $value === null ? null
            : json_encode($value, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_PRESERVE_ZERO_FRACTION | JSON_THROW_ON_ERROR);
    }
}
