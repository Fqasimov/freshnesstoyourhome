<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/**
 * Append-only. There is no update path and no delete path by design — this is
 * the record that answers "who cancelled this order, and when".
 */
class OrderEvent extends Model
{
    public const UPDATED_AT = null;

    protected $fillable = [
        'order_id', 'from_status', 'to_status', 'actor_id', 'actor_role', 'note',
    ];

    protected function casts(): array
    {
        return ['created_at' => 'datetime'];
    }
}
