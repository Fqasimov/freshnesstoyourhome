<?php

namespace App\Models;

use App\Models\Concerns\HasTranslations;
use App\Support\ProductImage;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Facades\Storage;

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

    /*
     * `image_file` is absent from $fillable deliberately. It is written only by
     * the upload path, which puts the file there itself; a caller that could
     * set it could point a product at any file on the public disk.
     */

    protected function casts(): array
    {
        return [
            'price_minor' => 'integer',
            'unit_qty' => 'float',
            'is_popular' => 'boolean',
            'is_active' => 'boolean',
            'in_stock' => 'boolean',
            'image_uploaded_at' => 'datetime',
        ];
    }

    /**
     * The uploaded photograph, if there is one.
     *
     * Null rather than a guess when there is not: the clients fall back to the
     * picture in their own bundle, and a URL that 404s is worse than no URL.
     */
    public function imageUrl(): ?string
    {
        return $this->image_file ? Storage::disk('public')->url($this->image_file) : null;
    }

    public function thumbUrl(): ?string
    {
        return $this->image_file
            ? Storage::disk('public')->url(ProductImage::thumbPath($this->image_file))
            : null;
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
