<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * More than one photograph per product.
 *
 * `products.image_file` stays the main picture — it is what every client already
 * reads. This table holds the extra ones, shown as a gallery when a product is
 * opened. Deleting a product removes its rows here (and the panel removes the
 * files).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('product_images', function (Blueprint $table) {
            $table->id();
            $table->string('product_id', 60);
            // Relative to the 'public' disk, e.g. products/01a0…c5.jpg
            $table->string('file');
            $table->unsignedSmallInteger('sort')->default(0);
            $table->timestamps();

            $table->index(['product_id', 'sort']);
            $table->foreign('product_id')->references('id')->on('products')->cascadeOnDelete();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('product_images');
    }
};
