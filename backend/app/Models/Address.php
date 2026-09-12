<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Address extends Model
{
    use HasUuids;

    protected $fillable = ['label', 'line', 'notes', 'lat', 'lng', 'delivery_zone_id', 'is_default'];

    protected function casts(): array
    {
        return [
            // Everything that identifies a household is encrypted. The zone id
            // stays in the clear because the delivery fee is computed from it.
            'label' => 'encrypted',
            'line' => 'encrypted',
            'notes' => 'encrypted',
            'lat' => 'encrypted',
            'lng' => 'encrypted',
            'is_default' => 'boolean',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function zone(): BelongsTo
    {
        return $this->belongsTo(DeliveryZone::class, 'delivery_zone_id');
    }
}
