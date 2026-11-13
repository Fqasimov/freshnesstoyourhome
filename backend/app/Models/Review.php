<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/**
 * A customer's review of a product. Written by anyone on the website, shown
 * only once approved in the panel — a public form with no account behind it
 * is a spam form until a person has looked.
 */
class Review extends Model
{
    public const PENDING = 'pending';
    public const APPROVED = 'approved';
    public const REJECTED = 'rejected';

    protected $fillable = ['product_id', 'name', 'rating', 'text', 'locale', 'status'];

    protected function casts(): array
    {
        return ['rating' => 'integer'];
    }
}
