<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;

/**
 * Print the secrets this application needs, ready to paste into .env.
 *
 * Deliberately prints rather than writing the file: on a production host these
 * belong in the platform's secret store, not on disk, and a command that
 * silently rewrites .env is a good way to lose a key that is already
 * encrypting live data.
 */
class GenerateKeys extends Command
{
    protected $signature = 'freshness:generate-keys';

    protected $description = 'Generate the encryption and blind-index keys for a new environment';

    public function handle(): int
    {
        $blindIndex = base64_encode(random_bytes(32));

        $this->newLine();
        $this->info('Add these to .env (or your host\'s secret store):');
        $this->newLine();
        $this->line('BLIND_INDEX_KEY='.$blindIndex);
        $this->newLine();

        $this->warn('APP_KEY: generate separately with `php artisan key:generate`.');
        $this->newLine();

        $this->comment('Read this before you deploy:');
        $this->line('  - BLIND_INDEX_KEY must differ from APP_KEY. Two keys, two');
        $this->line('    failure modes; one leaked key should not cost both.');
        $this->line('  - Changing BLIND_INDEX_KEY orphans every existing lookup hash:');
        $this->line('    customers become unfindable by email and cannot sign in.');
        $this->line('  - Changing APP_KEY makes every encrypted column unreadable.');
        $this->line('    There is no recovery. Back both up before the first order.');
        $this->newLine();

        return self::SUCCESS;
    }
}
