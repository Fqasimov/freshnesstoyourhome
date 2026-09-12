<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Devices that have agreed to receive order updates.
 *
 * An Expo push token identifies a device, not a person, and a phone can change
 * hands — so the token is unique across the table rather than per user. When
 * someone signs in on a device that already has a token, it moves to them; the
 * previous owner stops receiving notifications on a phone that is no longer
 * theirs, which is the only correct outcome.
 *
 * Tokens are not encrypted. They are not credentials for anything we hold, and
 * a blind index on a column we only ever look up by exact value would buy
 * nothing. They do go when the account is deleted.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('push_tokens', function (Blueprint $table) {
            $table->id();
            $table->foreignUuid('user_id')->constrained()->cascadeOnDelete();

            // ExponentPushToken[...] — one row per device.
            $table->string('token')->unique();

            $table->string('platform', 10)->nullable();
            $table->string('device_name', 60)->nullable();

            // Consecutive delivery failures. Expo tells us when a token is
            // dead and we delete it immediately; this counts the softer
            // failures so a token that never works does not get retried
            // forever.
            $table->unsignedTinyInteger('failures')->default(0);

            $table->timestamp('last_used_at')->nullable();
            $table->timestamps();

            $table->index('user_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('push_tokens');
    }
};
