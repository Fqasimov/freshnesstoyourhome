<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * One-time sign-in codes, sent by email.
 *
 * The code itself is never stored. Only a bcrypt hash is, so a copy of this
 * table does not let anyone sign in as a customer: a six-digit code is a small
 * search space, and a fast hash here would be recoverable in milliseconds.
 *
 * `attempts` is what stops the *online* attack — six digits is a million
 * guesses, which is nothing over HTTP. A code dies after a handful of wrong
 * tries and cannot be reused after a correct one.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('login_codes', function (Blueprint $table) {
            $table->id();

            // Blind index of the email the code was issued to. The address
            // itself is encrypted, so a leak of this table does not even
            // reveal who has been signing in.
            $table->char('email_hash', 64);
            $table->text('email');

            $table->string('code_hash');

            $table->timestamp('expires_at');
            $table->timestamp('consumed_at')->nullable();
            $table->unsignedTinyInteger('attempts')->default(0);

            // Kept for abuse investigation only, and pruned with the row.
            $table->string('request_ip', 45)->nullable();

            $table->timestamps();

            // The hot path: "newest live code for this email".
            $table->index(['email_hash', 'expires_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('login_codes');
    }
};
