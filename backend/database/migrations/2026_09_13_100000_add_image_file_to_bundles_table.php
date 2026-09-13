<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * A photograph for a set.
 *
 * Sets have never had one. The website draws a set as a strip of its four
 * products' pictures, which is honest — it shows exactly what is in the box —
 * and is also four photographs taken on four different days against four
 * different backgrounds. One photograph of the actual box, when the shop has
 * taken one, sells it better.
 *
 * So this is an override rather than a replacement: no upload, and the strip
 * is still what a customer sees.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('bundles', function (Blueprint $table) {
            $table->string('image_file')->nullable()->after('discount_percent');
            $table->timestamp('image_uploaded_at')->nullable()->after('image_file');
        });
    }

    public function down(): void
    {
        Schema::table('bundles', function (Blueprint $table) {
            $table->dropColumn(['image_file', 'image_uploaded_at']);
        });
    }
};
