<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Where we deliver, and where the customer lives.
 *
 * The zone is deliberately the only part of an address kept in the clear: the
 * delivery fee and the minimum-order rule are decided from it, so it has to be
 * queryable. Everything that identifies a household — street, building, flat,
 * door notes, coordinates — is encrypted.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('delivery_zones', function (Blueprint $table) {
            $table->string('id', 40)->primary();
            $table->unsignedBigInteger('fee_minor')->default(0);
            $table->unsignedBigInteger('min_order_minor')->default(0);
            $table->boolean('is_active')->default(true);
            $table->unsignedSmallInteger('sort')->default(0);
            $table->timestamps();
        });

        Schema::create('delivery_zone_translations', function (Blueprint $table) {
            $table->id();
            $table->string('delivery_zone_id', 40);
            $table->string('locale', 5);
            $table->string('name');
            $table->timestamps();

            $table->unique(['delivery_zone_id', 'locale']);
            $table->foreign('delivery_zone_id')->references('id')->on('delivery_zones')->cascadeOnDelete();
        });

        Schema::create('addresses', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('user_id')->constrained()->cascadeOnDelete();
            $table->string('delivery_zone_id', 40)->nullable();

            $table->text('label')->nullable();   // encrypted — "Ev", "İş"
            $table->text('line');                // encrypted — street, building, flat
            $table->text('notes')->nullable();   // encrypted — door code, floor
            $table->text('lat')->nullable();     // encrypted
            $table->text('lng')->nullable();     // encrypted

            $table->boolean('is_default')->default(false);
            $table->timestamps();

            $table->index(['user_id', 'is_default']);
            $table->foreign('delivery_zone_id')->references('id')->on('delivery_zones')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('addresses');
        Schema::dropIfExists('delivery_zone_translations');
        Schema::dropIfExists('delivery_zones');
    }
};
