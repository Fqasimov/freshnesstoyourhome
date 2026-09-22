<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * A pasted Google Maps link on an address.
 *
 * The website already asks for one before an order goes to WhatsApp, because a
 * Baku street address and a courier's idea of it are not always the same
 * place. The app had nowhere to keep it. Encrypted with the rest of the
 * address: a link that resolves to a doorstep identifies a household exactly
 * as well as the street line does.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('addresses', function (Blueprint $table) {
            $table->text('map_link')->nullable()->after('notes');
        });
    }

    public function down(): void
    {
        Schema::table('addresses', function (Blueprint $table) {
            $table->dropColumn('map_link');
        });
    }
};
