<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * A website order placed without an account can be claimed later, by whoever
 * placed it, once they sign in or sign up — so they can track it.
 *
 * The browser that placed the order is given a random token once; only its
 * hash is kept here, and only for a while. Knowing an order's code or the
 * phone number on it is not enough to take it.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->string('claim_token_hash', 64)->nullable()->unique();
            $table->timestamp('claim_expires_at')->nullable();
        });
    }

    public function down(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->dropUnique(['claim_token_hash']);
            $table->dropColumn(['claim_token_hash', 'claim_expires_at']);
        });
    }
};
