<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class DeliveryZoneTranslation extends Model
{
    protected $fillable = ['delivery_zone_id', 'locale', 'name'];
}
