<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/*
 * Which request a code was mailed for. A code is redeemable only with the
 * ticket handed back to that request, so a stranger asking for a code to the
 * same address can neither kill this one nor guess at it.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('login_codes', function (Blueprint $table) {
            $table->string('requester_hash', 64)->nullable()->after('email_hash');
            $table->index(['email_hash', 'requester_hash']);
        });
    }

    public function down(): void
    {
        Schema::table('login_codes', function (Blueprint $table) {
            $table->dropIndex(['email_hash', 'requester_hash']);
            $table->dropColumn('requester_hash');
        });
    }
};
