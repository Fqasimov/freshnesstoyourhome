<?php

use App\Models\Product;
use App\Support\Slug;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Every product gets a page of its own on the website, at /mehsul/{slug}.
 *
 * The slug is separate from the id on purpose. The id is the key on every
 * order line and is often English ("red-caviar"); the slug is what goes in
 * the address bar and in Google, and is made from the Azerbaijani name
 * ("qirmizi-ikra"). Existing products are given theirs here, in the shop's
 * own order, so the same catalogue always gets the same addresses.
 */
return new class extends Migration
{
    public function up(): void
    {
        // Safe to run again. MySQL cannot roll back a column it has added, so
        // a run that stopped half way leaves the column behind; the next run
        // picks up from there instead of failing on "duplicate column".
        if (! Schema::hasColumn('products', 'slug')) {
            Schema::table('products', function (Blueprint $table) {
                $table->string('slug', 80)->nullable()->unique()->after('id');
            });
        }

        // Written with the query builder rather than through the model, so the
        // backfill does not depend on the model's current methods — or on the
        // host having already picked up the new copy of the file.
        Product::with('translations')->orderBy('sort')->orderBy('id')->get()
            ->each(function (Product $p) {
                if (filled($p->slug)) {
                    return;
                }
                DB::table('products')->where('id', $p->id)->update(['slug' => Slug::uniqueFor($p)]);
            });
    }

    public function down(): void
    {
        Schema::table('products', function (Blueprint $table) {
            $table->dropUnique(['slug']);
            $table->dropColumn('slug');
        });
    }
};
