<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * What a category page says, and collection pages.
 *
 * A category page (/kataloq/kuru) gets, per language, its own title and
 * description for Google, an H1 and a text under the products — written in
 * the panel, falling back to a template when left empty — and a switch to
 * keep it out of Google ("Digər" has nothing to rank for).
 *
 * A collection (/kataloq/yeni-il-setleri) is a page the shop puts together:
 * chosen products and sets, with the same fields. It shares the /kataloq/
 * address space with categories, so the two never take the same slug.
 *
 * Every step checks first, so a run that stopped half way finishes on the
 * next one.
 */
return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasColumn('categories', 'is_indexed')) {
            Schema::table('categories', function (Blueprint $table) {
                $table->boolean('is_indexed')->default(true)->after('is_active');
            });
        }

        foreach (['seo_title' => 70, 'seo_description' => 170, 'h1' => 120] as $col => $len) {
            if (! Schema::hasColumn('category_translations', $col)) {
                Schema::table('category_translations', fn (Blueprint $t) => $t->string($col, $len)->nullable());
            }
        }
        if (! Schema::hasColumn('category_translations', 'body')) {
            Schema::table('category_translations', fn (Blueprint $t) => $t->text('body')->nullable());
        }

        if (! Schema::hasTable('collections')) {
            Schema::create('collections', function (Blueprint $table) {
                $table->id();
                $table->string('slug', 80)->unique();
                $table->boolean('is_active')->default(true);
                $table->boolean('is_indexed')->default(true);
                $table->unsignedInteger('sort')->default(0);
                $table->timestamps();
            });
        }

        if (! Schema::hasTable('collection_translations')) {
            Schema::create('collection_translations', function (Blueprint $table) {
                $table->id();
                $table->foreignId('collection_id')->constrained()->cascadeOnDelete();
                $table->string('locale', 2);
                $table->string('name', 120);
                $table->string('seo_title', 70)->nullable();
                $table->string('seo_description', 170)->nullable();
                $table->string('h1', 120)->nullable();
                $table->text('body')->nullable();
                $table->timestamps();
                $table->unique(['collection_id', 'locale']);
            });
        }

        if (! Schema::hasTable('collection_items')) {
            Schema::create('collection_items', function (Blueprint $table) {
                $table->id();
                $table->foreignId('collection_id')->constrained()->cascadeOnDelete();
                // A product or a set, by its code. Not a foreign key: it points
                // into one of two tables, and a product renamed in the panel
                // has its lines moved by the rename itself.
                $table->string('item_type', 10);
                $table->string('item_id', 60);
                $table->unsignedInteger('sort')->default(0);
                $table->unique(['collection_id', 'item_type', 'item_id']);
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('collection_items');
        Schema::dropIfExists('collection_translations');
        Schema::dropIfExists('collections');
        Schema::table('category_translations', function (Blueprint $t) {
            $t->dropColumn(['seo_title', 'seo_description', 'h1', 'body']);
        });
        Schema::table('categories', fn (Blueprint $t) => $t->dropColumn('is_indexed'));
    }
};
