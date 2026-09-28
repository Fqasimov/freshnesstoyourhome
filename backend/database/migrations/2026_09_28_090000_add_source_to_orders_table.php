<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Where an order came from, and orders without an account.
 *
 * `source` is one of web, ios, android or app (a phone that did not say
 * which). The website takes orders without an account — a name, a phone and
 * an address — so `user_id` may now be empty for those.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->string('source', 12)->default('app')->after('status');
            $table->index('source');
        });

        Schema::table('orders', function (Blueprint $table) {
            $table->foreignUuid('user_id')->nullable()->change();
        });
    }

    public function down(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->dropIndex(['source']);
            $table->dropColumn('source');
        });
    }
};
