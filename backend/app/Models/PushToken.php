<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PushToken extends Model
{
    protected $fillable = ['token', 'platform', 'device_name'];

    protected function casts(): array
    {
        return ['last_used_at' => 'datetime'];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Is this the shape Expo issues?
     *
     * Checked before anything is stored. A malformed token cannot be delivered
     * to and would sit in the table being retried; worse, an endpoint that
     * accepts arbitrary strings is an invitation to fill the table with them.
     */
    public static function looksValid(string $token): bool
    {
        return (bool) preg_match('/^Expo(nent)?PushToken\[[A-Za-z0-9_-]{1,64}\]$/', $token);
    }
}
