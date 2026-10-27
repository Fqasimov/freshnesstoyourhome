<?php

namespace App\Models;

use App\Models\Concerns\HasTranslations;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Category extends Model
{
    use HasTranslations;

    protected $keyType = 'string';
    public $incrementing = false;

    protected $fillable = ['id', 'slug', 'sort', 'is_active'];

    protected function casts(): array
    {
        return ['is_active' => 'boolean'];
    }

    /**
     * Its page on the website, /kataloq/{slug}. Made once the category has a
     * name and never rewritten afterwards, like a product's.
     */
    public function assignSlug(): void
    {
        if (filled($this->slug)) {
            return;
        }

        $this->load('translations');
        $this->forceFill(['slug' => \App\Support\Slug::uniqueForCategory($this)])->saveQuietly();
    }

    public function translations(): HasMany
    {
        return $this->hasMany(CategoryTranslation::class);
    }

    public function products(): HasMany
    {
        return $this->hasMany(Product::class);
    }
}
