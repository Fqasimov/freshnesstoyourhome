<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Discounts on products as well as sets, entered either as a percentage (with
 * decimals: 16.4%) or as an amount off the normal price (−2 AZN), with the shop
 * choosing which of the two the website shows.
 *
 *   discount_kind     null (no discount), 'percent' or 'amount' — what the shop
 *                     typed, and so what the price is worked out from
 *   discount_percent  the percentage, to two decimals
 *   discount_minor    the amount off, in qəpik
 *   discount_show     'percent' or 'amount' — the badge on the website
 *
 * A set always had a percentage, so the existing ones become 'percent'.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('products', function (Blueprint $table) {
            $table->string('discount_kind', 8)->nullable()->after('price_minor');
            $table->decimal('discount_percent', 5, 2)->default(0)->after('discount_kind');
            $table->unsignedInteger('discount_minor')->default(0)->after('discount_percent');
            $table->string('discount_show', 8)->default('percent')->after('discount_minor');
        });

        Schema::table('bundles', function (Blueprint $table) {
            $table->decimal('discount_percent', 5, 2)->default(0)->change();
            $table->string('discount_kind', 8)->default('percent')->after('id');
            $table->unsignedInteger('discount_minor')->default(0)->after('discount_percent');
            $table->string('discount_show', 8)->default('percent')->after('discount_minor');
        });
    }

    public function down(): void
    {
        Schema::table('products', function (Blueprint $table) {
            $table->dropColumn(['discount_kind', 'discount_percent', 'discount_minor', 'discount_show']);
        });

        Schema::table('bundles', function (Blueprint $table) {
            $table->dropColumn(['discount_kind', 'discount_minor', 'discount_show']);
        });
    }
};
