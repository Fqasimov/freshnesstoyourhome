<?php

namespace App\Models;

use App\Support\StoredImage;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Facades\Storage;

/**
 * An extra photograph of a product. `file` is written only by the upload path,
 * so it is not fillable.
 */
class ProductImage extends Model
{
    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }

    public function url(): string
    {
        return Storage::disk('public')->url($this->file);
    }

    public function thumbUrl(): string
    {
        return Storage::disk('public')->url(StoredImage::thumbPath($this->file));
    }
}
