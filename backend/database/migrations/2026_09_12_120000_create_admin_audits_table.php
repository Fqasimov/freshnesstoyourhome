<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Who changed what, from where.
 *
 * The admin panel can drop a price to one qəpik, empty a shelf or unblock an
 * account, and every one of those is a decision somebody made on a Tuesday and
 * will be asked about on a Friday. order_events already answers that question
 * for orders; this answers it for everything else.
 *
 * Append-only, like order_events: no updated_at, and nothing in the
 * application ever writes a second time to a row. The value of a log is
 * exactly the confidence that it was not edited afterwards.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('admin_audits', function (Blueprint $table) {
            $table->id();

            // Kept even if the staff account is later deleted — the change
            // still happened, and a null actor with a recorded role is more
            // honest than a deleted row.
            $table->foreignUuid('actor_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('actor_role', 16)->nullable();

            // 'product.update', 'bundle.update', 'user.block', …
            $table->string('action', 40);

            // Polymorphic by hand rather than with morphs(): subject ids in
            // this schema are slugs, uuids and integers all at once, so they
            // are stored as text and never joined on.
            $table->string('subject_type', 40);
            $table->string('subject_id', 64)->nullable();

            // {"price_minor": {"from": 4500, "to": 3900}} — only what moved.
            $table->json('changes')->nullable();

            $table->string('ip', 45)->nullable();
            $table->timestamp('created_at')->useCurrent();

            $table->index(['subject_type', 'subject_id']);
            $table->index('created_at');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('admin_audits');
    }
};
