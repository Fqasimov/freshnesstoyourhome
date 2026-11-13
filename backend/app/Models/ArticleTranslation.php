<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ArticleTranslation extends Model
{
    protected $fillable = ['article_id', 'locale', 'title', 'summary', 'body', 'seo_title', 'seo_description'];
}
