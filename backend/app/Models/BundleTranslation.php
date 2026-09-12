<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class BundleTranslation extends Model
{
    protected $fillable = ['bundle_id', 'locale', 'name', 'description'];
}
