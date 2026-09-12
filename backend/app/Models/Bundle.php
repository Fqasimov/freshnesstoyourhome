<?php

namespace App\Models;

use App\Models\Concerns\HasTranslations;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Bundle extends Model
{
    use HasTranslations;

    protected $keyType = 'string';
    public $incrementing = false;

    protected $fillable = ['id', 'discount_percent', 'is_active', 'sort'];

    protected function casts(): array
    {
        return [
            'discount_percent' => 'integer',
            'is_active' => 'boolean',
        ];
    }

    public function translations(): HasMany
    {
        return $this->hasMany(BundleTranslation::class);
    }

    public function items(): HasMany
    {
        return $this->hasMany(BundleItem::class);
    }
}
