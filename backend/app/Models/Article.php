<?php

namespace App\Models;

use App\Models\Concerns\HasTranslations;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

/** A recipe or article on the website: /resept/{slug}, linking to products. */
class Article extends Model
{
    use HasTranslations;

    protected $fillable = ['slug', 'is_published', 'published_on', 'products'];

    protected function casts(): array
    {
        return ['is_published' => 'boolean', 'published_on' => 'date', 'products' => 'array'];
    }

    public function translations(): HasMany
    {
        return $this->hasMany(ArticleTranslation::class);
    }
}
