<?php

use App\Models\Category;
use App\Support\Slug;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Every category gets a page of its own, /kataloq/{slug} — "qırmızı kürü" and
 * "dəniz məhsulları çatdırılma" are searches for a category, not for one
 * product. Safe to run again, like the products' slug migration.
 */
return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasColumn('categories', 'slug')) {
            Schema::table('categories', function (Blueprint $table) {
                $table->string('slug', 80)->nullable()->unique()->after('id');
            });
        }

        Category::with('translations')->orderBy('sort')->orderBy('id')->get()
            ->each(function (Category $c) {
                if (filled($c->slug)) {
                    return;
                }
                DB::table('categories')->where('id', $c->id)->update(['slug' => Slug::uniqueForCategory($c)]);
            });
    }

    public function down(): void
    {
        Schema::table('categories', function (Blueprint $table) {
            $table->dropUnique(['slug']);
            $table->dropColumn('slug');
        });
    }
};
