<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class BundleItem extends Model
{
    protected $fillable = ['bundle_id', 'product_id', 'qty'];

    protected function casts(): array
    {
        return ['qty' => 'float'];
    }

    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }
}
