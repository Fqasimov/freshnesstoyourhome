<?php

namespace App\Models;

use App\Support\BlindIndex;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;

/**
 * A one-time sign-in code.
 *
 * Never holds the code itself — only a bcrypt hash of it. See the migration
 * for why the hash has to be a slow one.
 */
class LoginCode extends Model
{
    protected $fillable = [
        'email_hash',
        'email',
        'code_hash',
        'expires_at',
        'request_ip',
    ];

    protected $hidden = [
        'code_hash',
        'email_hash',
        'request_ip',
    ];

    protected function casts(): array
    {
        return [
            'email' => 'encrypted',
            'expires_at' => 'datetime',
            'consumed_at' => 'datetime',
        ];
    }

    /** Live codes for an address: not yet used, not yet expired. */
    public function scopeUsableFor(Builder $query, string $email): Builder
    {
        return $query
            ->where('email_hash', BlindIndex::ofEmail($email))
            ->whereNull('consumed_at')
            ->where('expires_at', '>', now());
    }

    public function isExhausted(): bool
    {
        return $this->attempts >= (int) config('freshness.auth.max_attempts');
    }
}
