<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * SEO brief of 11 Nov 2026: a long description per product and language,
 * the product's real brand and barcode, a short intro and FAQ on category and
 * collection pages, and old product addresses kept as redirects.
 *
 * Every step checks first: on the host a migration can run twice (a deploy
 * retried after a timeout) and MySQL cannot roll back DDL.
 */
return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasColumn('product_translations', 'long_description')) {
            Schema::table('product_translations', fn (Blueprint $t) => $t->text('long_description')->nullable());
        }
        if (! Schema::hasColumn('products', 'brand')) {
            Schema::table('products', fn (Blueprint $t) => $t->string('brand', 80)->nullable());
        }
        if (! Schema::hasColumn('products', 'gtin')) {
            Schema::table('products', fn (Blueprint $t) => $t->string('gtin', 14)->nullable());
        }
        foreach (['category_translations', 'collection_translations'] as $table) {
            if (! Schema::hasColumn($table, 'intro')) {
                Schema::table($table, fn (Blueprint $t) => $t->text('intro')->nullable());
            }
            if (! Schema::hasColumn($table, 'faq')) {
                Schema::table($table, fn (Blueprint $t) => $t->text('faq')->nullable());
            }
        }
        // No foreign key: a product's code can change (ProductController::rename
        // moves these rows), and an address stays reserved after a delete.
        if (! Schema::hasTable('product_slug_redirects')) {
            Schema::create('product_slug_redirects', function (Blueprint $t) {
                $t->id();
                $t->string('old_slug', 80)->unique();
                $t->string('product_id', 60)->index();
                $t->timestamps();
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('product_slug_redirects');
    }
};
