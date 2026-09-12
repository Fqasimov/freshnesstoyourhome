<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class OrderItem extends Model
{
    protected $fillable = [];

    protected function casts(): array
    {
        return [
            'name_snapshot' => 'array',
            'unit_price_minor' => 'integer',
            'unit_qty' => 'float',
            'qty' => 'float',
            'confirmed_qty' => 'float',
            'is_weight_based' => 'boolean',
            'line_total_minor' => 'integer',
            'final_line_total_minor' => 'integer',
        ];
    }

    public function order(): BelongsTo
    {
        return $this->belongsTo(Order::class);
    }

    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }
}
