<?php

use Illuminate\Contracts\Encryption\DecryptException;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\DB;

/**
 * Encrypt the free text that was still stored as typed: the reason a customer
 * gave when cancelling, and the note on an order's status history.
 *
 * Safe to run twice and safe next to live traffic: a value that already
 * decrypts is left alone, and the model casts read both forms meanwhile. Login
 * codes also stop keeping the address they were requested from; old values go.
 */
return new class extends Migration
{
    public function up(): void
    {
        $this->encrypt('orders', 'cancel_reason');
        $this->encrypt('order_events', 'note');

        DB::table('login_codes')->whereNotNull('request_ip')->update(['request_ip' => null]);
    }

    public function down(): void
    {
        // Nothing to undo: plain text is not restored on purpose.
    }

    private function encrypt(string $table, string $column): void
    {
        DB::table($table)->whereNotNull($column)->where($column, '!=', '')
            ->orderBy('id')
            ->each(function ($row) use ($table, $column) {
                try {
                    Crypt::decryptString($row->{$column});

                    return; // already ciphertext
                } catch (DecryptException) {
                    // plain text: encrypt it below
                }

                DB::table($table)->where('id', $row->id)
                    ->update([$column => Crypt::encryptString($row->{$column})]);
            });
    }
};
