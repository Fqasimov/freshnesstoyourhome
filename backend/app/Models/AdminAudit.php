<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Append-only. Written through App\Support\Audit and never updated.
 */
class AdminAudit extends Model
{
    public const UPDATED_AT = null;

    protected $fillable = [
        'actor_id', 'actor_role', 'action', 'subject_type', 'subject_id', 'changes', 'ip',
        'user_agent', 'prev_hash', 'hash', 'created_at',
    ];

    protected $hidden = ['prev_hash', 'hash'];

    protected function casts(): array
    {
        return [
            'changes' => 'array',
            'created_at' => 'datetime',
        ];
    }

    public function actor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'actor_id');
    }
}
