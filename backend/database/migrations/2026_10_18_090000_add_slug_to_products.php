<?php

use App\Models\Product;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
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
        Schema::table('products', function (Blueprint $table) {
            $table->string('slug', 80)->nullable()->unique()->after('id');
        });

        Product::with('translations')->orderBy('sort')->orderBy('id')->get()
            ->each(fn (Product $p) => $p->assignSlug());
    }

    public function down(): void
    {
        Schema::table('products', function (Blueprint $table) {
            $table->dropUnique(['slug']);
            $table->dropColumn('slug');
        });
    }
};
