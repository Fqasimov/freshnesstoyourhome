<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Customers.
 *
 * There is no password column and there never should be: sign-in is a
 * one-time code sent to the customer's email, so the database holds no
 * credential that is worth stealing.
 *
 * Email, name and phone are encrypted at rest (see the `encrypted` casts on
 * the model). Encrypted columns cannot be searched, so each value that has to
 * be looked up carries a *blind index* alongside it — a keyed HMAC of the
 * normalised value, under a key that is NOT the application key. Lookup is by
 * hash; display is by decrypting. An attacker with a copy of the database and
 * no keys gets a list of opaque blobs.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('users', function (Blueprint $table) {
            $table->uuid('id')->primary();

            // Blind index: unique, so it also enforces one account per email.
            $table->char('email_hash', 64)->unique();
            $table->text('email')->nullable();

            $table->text('name')->nullable();

            // Couriers need to phone the customer at the door.
            $table->text('phone')->nullable();
            $table->char('phone_hash', 64)->nullable()->index();

            $table->string('locale', 5)->default('az');

            // Never mass-assignable, never settable over the API. The whole
            // privilege-escalation class depends on this column staying out of
            // reach of anything a customer can send.
            $table->string('role', 16)->default('customer');

            $table->timestamp('email_verified_at')->nullable();
            $table->timestamp('last_login_at')->nullable();

            // Set by an admin to lock an account out without deleting it.
            $table->timestamp('blocked_at')->nullable();

            // Set when the customer deletes their account in-app. The row
            // survives with its personal data scrubbed so that the financial
            // record of past orders stays intact.
            $table->timestamp('anonymised_at')->nullable();

            $table->timestamps();
        });

        Schema::create('sessions', function (Blueprint $table) {
            $table->string('id')->primary();
            $table->foreignUuid('user_id')->nullable()->index();
            $table->string('ip_address', 45)->nullable();
            $table->text('user_agent')->nullable();
            $table->longText('payload');
            $table->integer('last_activity')->index();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('sessions');
        Schema::dropIfExists('users');
    }
};
