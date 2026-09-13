<?php

namespace App\Models;

use App\Models\Concerns\HasTranslations;
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
    protected $fillable = ['id', 'discount_percent', 'is_active', 'sort'];

    protected function casts(): array
    {
        return [
            'discount_percent' => 'integer',
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
}
