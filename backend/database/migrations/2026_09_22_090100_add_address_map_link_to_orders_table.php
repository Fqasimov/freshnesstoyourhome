<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * The map link, snapshotted onto the order.
 *
 * A link kept only on the saved address is no use to the courier holding the
 * order — and editing that address next month would rewrite where last month's
 * delivery went. Snapshotted and encrypted for the same reasons as the street
 * line beside it.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->text('address_map_link')->nullable()->after('address_notes');
        });
    }

    public function down(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->dropColumn('address_map_link');
        });
    }
};
