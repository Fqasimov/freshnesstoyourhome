<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Make the audit trail tamper-evident.
 *
 * Each row carries a keyed hash of itself and of the row before it, so
 * editing or deleting a line in the middle breaks every hash after it — and
 * the key lives in .env, not in the database, so somebody holding only the
 * database (a leaked backup, an injection) cannot rewrite the chain to match.
 * See App\Support\Audit::verify().
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('admin_audits', function (Blueprint $table) {
            $table->string('user_agent', 255)->nullable()->after('ip');
            $table->char('prev_hash', 64)->nullable()->after('user_agent');
            $table->char('hash', 64)->nullable()->after('prev_hash');
        });
    }

    public function down(): void
    {
        Schema::table('admin_audits', function (Blueprint $table) {
            $table->dropColumn(['user_agent', 'prev_hash', 'hash']);
        });
    }
};
