<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class CollectionTranslation extends Model
{
    protected $fillable = ['collection_id', 'locale', 'name', 'seo_title', 'seo_description', 'h1', 'body'];
}
