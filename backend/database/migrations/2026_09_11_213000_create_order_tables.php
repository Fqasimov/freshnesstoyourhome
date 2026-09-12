<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Orders.
 *
 * Two things about this table are load-bearing.
 *
 * 1. Every money column is written by the server, from the server's own
 *    catalogue. Nothing a client sends reaches them. A request body says only
 *    which product and how many.
 *
 * 2. Most of this catalogue is sold by the kilo, and a kilo of smoked salmon
 *    is never exactly a kilo. So an order carries an *estimate* until the
 *    goods are weighed, and a confirmed total afterwards. The customer agrees
 *    to the estimate plus a stated tolerance; the courier confirms the real
 *    weight; `final_total_minor` is what is actually collected. Without this
 *    split every weighed order is an argument at the door.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('orders', function (Blueprint $table) {
            $table->uuid('id')->primary();

            // What the customer and the courier say out loud. Never the uuid.
            $table->string('code', 20)->unique();

            $table->foreignUuid('user_id')->constrained()->restrictOnDelete();

            $table->string('status', 24)->default('placed');
            $table->string('currency', 3)->default('AZN');

            // Estimate, priced by the server at checkout.
            $table->unsignedBigInteger('subtotal_minor');
            $table->unsignedBigInteger('delivery_fee_minor')->default(0);
            $table->unsignedBigInteger('discount_minor')->default(0);
            $table->unsignedBigInteger('total_minor');

            // Weighing. `requires_weighing` is derived from the basket, never
            // sent by the client.
            $table->boolean('requires_weighing')->default(false);
            $table->unsignedBigInteger('final_subtotal_minor')->nullable();
            $table->unsignedBigInteger('final_total_minor')->nullable();
            $table->timestamp('weighed_at')->nullable();
            $table->foreignUuid('weighed_by')->nullable()->constrained('users')->nullOnDelete();

            // Contact and address are snapshotted so that editing a saved
            // address later does not rewrite the history of a delivered order.
            $table->text('contact_name')->nullable();   // encrypted
            $table->text('contact_phone')->nullable();  // encrypted
            $table->text('address_line')->nullable();   // encrypted
            $table->text('address_notes')->nullable();  // encrypted
            $table->string('delivery_zone_id', 40)->nullable();

            $table->date('delivery_date')->nullable();
            $table->string('delivery_slot', 20)->nullable();

            // Cash or card-at-the-door. Nothing is charged online, which keeps
            // this system entirely outside PCI scope.
            $table->string('payment_method', 16)->default('cash');

            $table->text('customer_note')->nullable(); // encrypted

            $table->timestamp('placed_at')->nullable();
            $table->timestamp('confirmed_at')->nullable();
            $table->timestamp('delivered_at')->nullable();
            $table->timestamp('cancelled_at')->nullable();
            $table->string('cancelled_by', 16)->nullable();
            $table->text('cancel_reason')->nullable();

            $table->timestamps();

            $table->index(['user_id', 'created_at']);
            $table->index(['status', 'delivery_date']);
            $table->foreign('delivery_zone_id')->references('id')->on('delivery_zones')->nullOnDelete();
        });

        Schema::create('order_items', function (Blueprint $table) {
            $table->id();
            $table->foreignUuid('order_id')->constrained()->cascadeOnDelete();

            // Null if the product is later removed from the catalogue; the
            // snapshot below is what keeps the order readable.
            $table->string('product_id', 60)->nullable();

            // Name in all three languages as it was at the time of sale, plus
            // the price we actually charged. A later price change must never
            // alter what a past order says it cost.
            $table->json('name_snapshot');
            $table->unsignedBigInteger('unit_price_minor');
            $table->string('unit_kind', 8);
            $table->decimal('unit_qty', 10, 3)->default(1);

            $table->decimal('qty', 10, 3);
            $table->boolean('is_weight_based')->default(false);

            // Set by the courier for weighed lines.
            $table->decimal('confirmed_qty', 10, 3)->nullable();

            $table->unsignedBigInteger('line_total_minor');
            $table->unsignedBigInteger('final_line_total_minor')->nullable();

            $table->timestamps();

            $table->index('order_id');
            $table->foreign('product_id')->references('id')->on('products')->nullOnDelete();
        });

        /**
         * Append-only audit trail. Every status change writes a row here, and
         * nothing ever updates or deletes one — if a dispute reaches "who
         * cancelled this and when", this table is the answer.
         */
        Schema::create('order_events', function (Blueprint $table) {
            $table->id();
            $table->foreignUuid('order_id')->constrained()->cascadeOnDelete();
            $table->string('from_status', 24)->nullable();
            $table->string('to_status', 24);
            $table->foreignUuid('actor_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('actor_role', 16)->nullable();
            $table->text('note')->nullable();
            $table->timestamp('created_at')->nullable();

            $table->index(['order_id', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('order_events');
        Schema::dropIfExists('order_items');
        Schema::dropIfExists('orders');
    }
};
