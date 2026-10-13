<?php

namespace App\Models;

use App\Models\Concerns\HasTranslations;
use App\Support\Discount;
use App\Support\Money;
use App\Support\StoredImage;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Facades\Storage;

class Bundle extends Model
{
    use HasTranslations;

    protected $keyType = 'string';
    public $incrementing = false;

    /* `image_file` is absent deliberately: it is written only by the upload
       path, which puts the file there itself. */
    protected $fillable = ['id', 'discount_kind', 'discount_percent', 'discount_minor', 'discount_show', 'is_active', 'sort'];

    protected function casts(): array
    {
        return [
            'discount_percent' => 'float',
            'discount_minor' => 'integer',
            'is_active' => 'boolean',
            'image_uploaded_at' => 'datetime',
        ];
    }

    /** The set's own photograph, if one was uploaded. */
    public function imageUrl(): ?string
    {
        return $this->image_file ? Storage::disk('public')->url($this->image_file) : null;
    }

    public function thumbUrl(): ?string
    {
        return $this->image_file
            ? Storage::disk('public')->url(StoredImage::thumbPath($this->image_file))
            : null;
    }

    public function translations(): HasMany
    {
        return $this->hasMany(BundleTranslation::class);
    }

    public function items(): HasMany
    {
        return $this->hasMany(BundleItem::class);
    }

    /**
     * One unit of a product inside this set, given what the whole set costs
     * at its products' own prices. A percentage comes off each unit; an amount
     * off the set is shared across its units in proportion to their price.
     * Each unit is rounded to the qəpik on its own, so an order line, the
     * website and the panel do the same arithmetic.
     */
    public function unitMinor(int $unitPriceMinor, int $fullMinor): int
    {
        return $this->discount_kind === Discount::AMOUNT
            ? Discount::shareOf($unitPriceMinor, $fullMinor, (int) $this->discount_minor)
            : Discount::percentOff($unitPriceMinor, Discount::basisPoints($this->discount_percent));
    }

    /**
     * The set before and after its discount.
     *
     * @param  array<string, int>  $unitPrice  product id => what one unit costs today
     * @return array{full_minor: int, price_minor: int, discount: array|null, effective_percent: float}
     */
    public function totals(array $unitPrice): array
    {
        $items = $this->items->filter(fn ($i) => isset($unitPrice[$i->product_id]));

        $full = (int) $items->sum(fn ($i) => Money::line($unitPrice[$i->product_id], (float) $i->qty));
        $price = (int) $items->sum(fn ($i) => Money::line(
            $this->unitMinor($unitPrice[$i->product_id], $full), (float) $i->qty,
        ));

        return [
            'full_minor' => $full,
            'price_minor' => $price,
            'discount' => Discount::badge((string) $this->discount_show, $this->discount_kind, (float) $this->discount_percent, $full, $price),
            'effective_percent' => $full > 0 ? round(($full - $price) / $full * 100, 2) : 0.0,
        ];
    }
}
