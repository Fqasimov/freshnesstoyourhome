<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Photographs uploaded from the admin panel.
 *
 * A separate column from `image_path` on purpose. `image_path` names a picture
 * that ships inside the website and the app bundles — that is how every
 * product's photo has worked so far, and those clients look it up in their own
 * assets. A path stored there that only exists on the server would leave the
 * app showing nothing.
 *
 * So an upload lands here instead, and the catalogue endpoint sends both: a
 * client that understands the URL uses it, and one that does not keeps
 * rendering the bundled photo. Removing the upload falls back rather than
 * leaving a hole.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('products', function (Blueprint $table) {
            // Relative to the 'public' disk, e.g. products/01a0…c5.jpg
            $table->string('image_file')->nullable()->after('image_path');
            $table->timestamp('image_uploaded_at')->nullable()->after('image_file');
        });
    }

    public function down(): void
    {
        Schema::table('products', function (Blueprint $table) {
            $table->dropColumn(['image_file', 'image_uploaded_at']);
        });
    }
};
