<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Contracts\Encryption\DecryptException;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\DB;

/**
 * Re-encrypt every encrypted column under the key now in APP_KEY.
 *
 * This is the second half of changing APP_KEY. The first half is putting the
 * old key in APP_PREVIOUS_KEYS so the data can still be read; this rewrites
 * each value under the new key, after which the old key can be thrown away. Do
 * it the day a key may have been seen by someone who should not have seen it —
 * a stolen backup of the server's files is such a day.
 *
 * Idempotent: running it again just writes the same plaintext under fresh
 * ciphertext. A value that cannot be decrypted with either key is left as it
 * is and reported, never overwritten.
 */
class ReencryptData extends Command
{
    protected $signature = 'freshness:reencrypt {--dry-run : Count what would be rewritten and change nothing}';

    protected $description = 'Re-encrypt all encrypted columns under the current APP_KEY (after a key change)';

    /** table => [primary key, columns] — every column that holds ciphertext. */
    public const COLUMNS = [
        'users' => ['id', ['email', 'name', 'phone', 'date_of_birth', 'two_factor_secret', 'two_factor_recovery_codes']],
        'addresses' => ['id', ['label', 'line', 'notes', 'map_link', 'lat', 'lng']],
        'orders' => ['id', ['contact_name', 'contact_phone', 'address_line', 'address_notes', 'address_map_link', 'customer_note', 'cancel_reason']],
        'order_events' => ['id', ['note']],
        'login_codes' => ['id', ['email']],
    ];

    public function handle(): int
    {
        $dry = (bool) $this->option('dry-run');
        $failed = 0;

        foreach (self::COLUMNS as $table => [$key, $columns]) {
            $rewritten = 0;

            DB::table($table)->orderBy($key)->each(function ($row) use ($table, $key, $columns, $dry, &$rewritten, &$failed) {
                $changes = [];

                foreach ($columns as $column) {
                    $value = $row->{$column} ?? null;
                    if ($value === null || $value === '') {
                        continue;
                    }

                    try {
                        $changes[$column] = Crypt::encryptString(Crypt::decryptString($value));
                    } catch (DecryptException) {
                        $failed++;
                        $this->warn("  {$table}.{$column} ({$key} {$row->{$key}}): not readable with the current or previous keys — left alone");
                    }
                }

                if ($changes !== []) {
                    $rewritten++;
                    if (! $dry) {
                        DB::table($table)->where($key, $row->{$key})->update($changes);
                    }
                }
            });

            $this->line(sprintf('%-14s %d row(s) %s', $table, $rewritten, $dry ? 'would be rewritten' : 'rewritten'));
        }

        if ($failed > 0) {
            $this->error("{$failed} value(s) could not be decrypted. Do not remove the old key from APP_PREVIOUS_KEYS yet.");

            return self::FAILURE;
        }

        $this->info($dry ? 'Dry run: nothing changed.' : 'Done. The old key can now be removed from APP_PREVIOUS_KEYS.');

        return self::SUCCESS;
    }
}
