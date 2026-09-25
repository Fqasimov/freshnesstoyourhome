<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * A second factor for the admin panel: an authenticator app (RFC 6238 TOTP).
 *
 * The panel's first factor is a code mailed to the admin's inbox. On its own
 * that makes the inbox the whole key; with this, somebody who gets into the
 * inbox still needs the admin's phone.
 *
 * The secret and the recovery codes are encrypted under APP_KEY like every
 * other personal field, so a copy of the database alone does not yield them.
 * Recovery codes are stored as SHA-256 hashes inside that encryption: shown
 * once, never readable again, even by us.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->text('two_factor_secret')->nullable();
            // Null until the admin proves their app produces the right codes.
            // An unconfirmed secret is replaced on every sign-in, so one that
            // leaked half-way through enrolment is worth nothing.
            $table->timestamp('two_factor_confirmed_at')->nullable();
            $table->text('two_factor_recovery_codes')->nullable();
            // The 30-second time step of the last code accepted. A code is
            // good for one use: replaying it inside its window is refused.
            $table->unsignedBigInteger('two_factor_last_step')->nullable();
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn([
                'two_factor_secret',
                'two_factor_confirmed_at',
                'two_factor_recovery_codes',
                'two_factor_last_step',
            ]);
        });
    }
};
