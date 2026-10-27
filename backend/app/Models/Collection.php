<?php

namespace App\Models;

use App\Models\Concerns\HasTranslations;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

/** A page the shop puts together from chosen products and sets: /kataloq/{slug}. */
class Collection extends Model
{
    use HasTranslations;

    protected $fillable = ['slug', 'is_active', 'is_indexed', 'sort'];

    protected function casts(): array
    {
        return ['is_active' => 'boolean', 'is_indexed' => 'boolean'];
    }

    public function translations(): HasMany
    {
        return $this->hasMany(CollectionTranslation::class);
    }

    public function items(): HasMany
    {
        return $this->hasMany(CollectionItem::class)->orderBy('sort')->orderBy('id');
    }
}
