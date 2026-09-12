<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * The catalogue.
 *
 * This is the single source of truth for what is on sale and what it costs.
 * Nothing is priced in the app bundle or the website bundle — a price change
 * is a row update, not a new App Store review.
 *
 * Money is stored in minor units (qəpik) as integers. Floating point money is
 * how you end up charging 24.599999999 AZN.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('categories', function (Blueprint $table) {
            $table->string('id', 40)->primary();
            $table->unsignedSmallInteger('sort')->default(0);
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });

        Schema::create('category_translations', function (Blueprint $table) {
            $table->id();
            $table->string('category_id', 40);
            $table->string('locale', 5);
            $table->string('name');
            $table->timestamps();

            $table->unique(['category_id', 'locale']);
            $table->foreign('category_id')->references('id')->on('categories')->cascadeOnDelete();
        });

        Schema::create('products', function (Blueprint $table) {
            // Slug ids double as the image filename, so the photo a customer
            // sees and the row they are buying cannot drift apart.
            $table->string('id', 60)->primary();
            $table->string('category_id', 40);

            $table->unsignedBigInteger('price_minor');
            $table->string('currency', 3)->default('AZN');

            // 'kg' lines are sold by weight and can only ever be an estimate
            // until the courier weighs them; 'pc' lines are exact.
            $table->string('unit_kind', 8);
            $table->decimal('unit_qty', 10, 3)->default(1);

            $table->boolean('is_popular')->default(false);
            $table->boolean('is_active')->default(true);
            $table->boolean('in_stock')->default(true);

            $table->string('image_path')->nullable();
            $table->unsignedSmallInteger('sort')->default(0);

            $table->timestamps();

            $table->index(['category_id', 'is_active']);
            $table->foreign('category_id')->references('id')->on('categories')->cascadeOnDelete();
        });

        Schema::create('product_translations', function (Blueprint $table) {
            $table->id();
            $table->string('product_id', 60);
            $table->string('locale', 5);
            $table->string('name');
            $table->text('description')->nullable();
            $table->string('unit_label', 40)->nullable();
            $table->timestamps();

            $table->unique(['product_id', 'locale']);
            $table->foreign('product_id')->references('id')->on('products')->cascadeOnDelete();
        });

        /**
         * Discounted bundles.
         *
         * The table exists so the feature has a home, but nothing is seeded
         * active: the bundle contents and their discounts on the website are
         * placeholders invented during design, and an app turns a placeholder
         * promotion into a real transaction. These stay inactive until the
         * business confirms them.
         */
        Schema::create('bundles', function (Blueprint $table) {
            $table->string('id', 40)->primary();
            $table->unsignedTinyInteger('discount_percent')->default(0);
            $table->boolean('is_active')->default(false);
            $table->unsignedSmallInteger('sort')->default(0);
            $table->timestamps();
        });

        Schema::create('bundle_translations', function (Blueprint $table) {
            $table->id();
            $table->string('bundle_id', 40);
            $table->string('locale', 5);
            $table->string('name');
            $table->text('description')->nullable();
            $table->timestamps();

            $table->unique(['bundle_id', 'locale']);
            $table->foreign('bundle_id')->references('id')->on('bundles')->cascadeOnDelete();
        });

        Schema::create('bundle_items', function (Blueprint $table) {
            $table->id();
            $table->string('bundle_id', 40);
            $table->string('product_id', 60);
            $table->decimal('qty', 10, 3)->default(1);
            $table->timestamps();

            $table->unique(['bundle_id', 'product_id']);
            $table->foreign('bundle_id')->references('id')->on('bundles')->cascadeOnDelete();
            $table->foreign('product_id')->references('id')->on('products')->cascadeOnDelete();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('bundle_items');
        Schema::dropIfExists('bundle_translations');
        Schema::dropIfExists('bundles');
        Schema::dropIfExists('product_translations');
        Schema::dropIfExists('products');
        Schema::dropIfExists('category_translations');
        Schema::dropIfExists('categories');
    }
};
