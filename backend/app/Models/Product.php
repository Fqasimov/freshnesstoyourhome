<?php

namespace App\Models;

use App\Models\Concerns\HasTranslations;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Product extends Model
{
    use HasTranslations;

    public const UNIT_KG = 'kg';
    public const UNIT_PIECE = 'pc';

    protected $keyType = 'string';
    public $incrementing = false;

    protected $fillable = [
        'id', 'category_id', 'price_minor', 'currency', 'unit_kind',
        'unit_qty', 'is_popular', 'is_active', 'in_stock', 'image_path', 'sort',
    ];

    protected function casts(): array
    {
        return [
            'price_minor' => 'integer',
            'unit_qty' => 'float',
            'is_popular' => 'boolean',
            'is_active' => 'boolean',
            'in_stock' => 'boolean',
        ];
    }

    public function category(): BelongsTo
    {
        return $this->belongsTo(Category::class);
    }

    public function translations(): HasMany
    {
        return $this->hasMany(ProductTranslation::class);
    }

    /**
     * Sold by weight, so the price at checkout can only be an estimate.
     *
     * This is the flag the whole weigh-at-the-door flow keys off, and it is
     * derived from the catalogue — never from anything a client sends.
     */
    public function isWeightBased(): bool
    {
        return $this->unit_kind === self::UNIT_KG;
    }

    public function scopeOrderable(Builder $query): Builder
    {
        return $query->where('is_active', true)->where('in_stock', true);
    }
}
