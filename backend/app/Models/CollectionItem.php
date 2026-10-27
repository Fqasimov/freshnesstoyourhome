<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class CollectionItem extends Model
{
    public const PRODUCT = 'product';
    public const BUNDLE = 'bundle';

    public $timestamps = false;

    protected $fillable = ['collection_id', 'item_type', 'item_id', 'sort'];
}
