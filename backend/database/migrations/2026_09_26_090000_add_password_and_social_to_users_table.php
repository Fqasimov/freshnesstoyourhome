<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Passwords, a birth date, and Google / Apple sign-in for the app.
 *
 * The emailed code stays the proof of an address: an account row is only
 * written once that code has been typed back (see RegistrationService). The
 * password is what a returning customer uses after that, so they are not
 * sent to their inbox on every visit.
 *
 * The provider ids are blind-indexed like the email — a keyed hash, looked up
 * but never readable — so a copy of the table does not say who signs in with
 * which Google account.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->string('password')->nullable()->after('phone_hash');
            // Encrypted like the rest of the personal data, so text, not date.
            $table->text('date_of_birth')->nullable()->after('password');
            $table->char('google_id_hash', 64)->nullable()->unique()->after('date_of_birth');
            $table->char('apple_id_hash', 64)->nullable()->unique()->after('google_id_hash');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropUnique(['google_id_hash']);
            $table->dropUnique(['apple_id_hash']);
            $table->dropColumn(['password', 'date_of_birth', 'google_id_hash', 'apple_id_hash']);
        });
    }
};
