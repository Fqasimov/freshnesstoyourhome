<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class CategoryTranslation extends Model
{
    protected $fillable = ['category_id', 'locale', 'name', 'seo_title', 'seo_description', 'h1', 'body', 'intro', 'faq'];

    protected function casts(): array
    {
        return ['faq' => 'array'];
    }
}
