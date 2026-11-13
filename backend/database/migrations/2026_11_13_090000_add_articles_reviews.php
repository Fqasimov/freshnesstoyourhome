<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Recipes and articles (/resept/{slug}), customer reviews of products
 * (moderated before they show), and old category addresses kept as
 * redirects. Every step checks first, as the host may run this twice.
 */
return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('articles')) {
            Schema::create('articles', function (Blueprint $t) {
                $t->id();
                $t->string('slug', 80)->unique();
                $t->boolean('is_published')->default(false);
                $t->date('published_on')->nullable();
                // Products the article links to, in order: ["burrata-plain", …].
                $t->text('products')->nullable();
                $t->timestamps();
            });
        }
        if (! Schema::hasTable('article_translations')) {
            Schema::create('article_translations', function (Blueprint $t) {
                $t->id();
                $t->unsignedBigInteger('article_id');
                $t->string('locale', 5);
                $t->string('title', 140);
                $t->string('summary', 300)->nullable();
                $t->text('body')->nullable();
                $t->string('seo_title', 70)->nullable();
                $t->string('seo_description', 170)->nullable();
                $t->timestamps();
                $t->unique(['article_id', 'locale']);
                $t->foreign('article_id')->references('id')->on('articles')->cascadeOnDelete();
            });
        }
        if (! Schema::hasTable('reviews')) {
            Schema::create('reviews', function (Blueprint $t) {
                $t->id();
                $t->string('product_id', 60)->index();
                $t->string('name', 60);
                $t->unsignedTinyInteger('rating');
                $t->text('text')->nullable();
                $t->string('locale', 5)->default('az');
                // pending → approved or rejected, in the panel. Only approved show.
                $t->string('status', 10)->default('pending')->index();
                $t->timestamps();
            });
        }
        if (! Schema::hasTable('category_slug_redirects')) {
            Schema::create('category_slug_redirects', function (Blueprint $t) {
                $t->id();
                $t->string('old_slug', 80)->unique();
                $t->string('category_id', 60)->index();
                $t->timestamps();
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('article_translations');
        Schema::dropIfExists('articles');
        Schema::dropIfExists('reviews');
        Schema::dropIfExists('category_slug_redirects');
    }
};
