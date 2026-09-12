<?php

namespace App\Models;

use App\Models\Concerns\HasTranslations;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class DeliveryZone extends Model
{
    use HasTranslations;

    protected $keyType = 'string';
    public $incrementing = false;

    protected $fillable = ['id', 'fee_minor', 'min_order_minor', 'is_active', 'sort'];

    protected function casts(): array
    {
        return [
            'fee_minor' => 'integer',
            'min_order_minor' => 'integer',
            'is_active' => 'boolean',
        ];
    }

    public function translations(): HasMany
    {
        return $this->hasMany(DeliveryZoneTranslation::class);
    }
}
