<?php

namespace App\Console\Commands;

use App\Models\PushToken;
use App\Models\User;
use App\Services\PushSender;
use Illuminate\Console\Command;

/**
 * Send a real push to a real device, to prove the path works.
 *
 * Push is the one part of this system that cannot be verified from a test
 * suite: a faked HTTP client proves the request is well formed, not that a
 * phone buzzes. Apple's and Google's credentials sit with Expo, the device
 * token comes from the OS, and any one of those can be wrong in a way nothing
 * else reports.
 *
 * Run it after the first real build, and after any change to the EAS project.
 */
class PushTest extends Command
{
    protected $signature = 'freshness:push-test
        {email? : Send to this customer\'s devices. Omit to list who has one.}
        {--title= : Override the title}
        {--body= : Override the body}';

    protected $description = 'Send a test push notification to a registered device';

    public function handle(PushSender $sender): int
    {
        $email = $this->argument('email');

        if ($email === null) {
            return $this->listDevices();
        }

        $user = User::findByEmail($email);

        if ($user === null) {
            $this->error("No account for [{$email}].");

            return self::FAILURE;
        }

        $tokens = $user->pushTokens()->get();

        if ($tokens->isEmpty()) {
            $this->error('That account has no registered device.');
            $this->newLine();
            $this->line('The app registers one after the customer accepts the');
            $this->line('prompt, which it shows on the screen after their first');
            $this->line('order. Expo Go on a simulator never registers — push');
            $this->line('needs a real device.');

            return self::FAILURE;
        }

        $this->newLine();
        $this->line('  devices  '.$tokens->count());
        foreach ($tokens as $t) {
            $this->line('           '.($t->device_name ?: $t->platform ?: 'unknown')
                .'  '.mb_substr($t->token, 0, 28).'…');
        }
        $this->newLine();

        $sender->send(
            $tokens,
            (string) ($this->option('title') ?: 'Freshness To Your Home'),
            (string) ($this->option('body') ?: 'Test bildirişi — hər şey işləyir.'),
            ['type' => 'test'],
        );

        // send() swallows transport errors on purpose, so that a push failure
        // can never break an order. Re-read to see what actually happened.
        $remaining = PushToken::where('user_id', $user->id)->count();

        if ($remaining < $tokens->count()) {
            $this->warn(($tokens->count() - $remaining).' token(s) were dropped: '
                .'Expo reported the app is no longer installed on that device.');
        }

        $this->info('Sent. If nothing arrives, check in this order:');
        $this->line('  1. the device is a real phone, not a simulator');
        $this->line('  2. notifications are allowed for the app in OS settings');
        $this->line('  3. the build has an EAS project id (`eas init`)');
        $this->line('  4. storage/logs/laravel.log for what Expo said back');
        $this->newLine();

        return self::SUCCESS;
    }

    private function listDevices(): int
    {
        $rows = PushToken::with('user')->get()->map(fn (PushToken $t) => [
            $t->user?->email ?? '(deleted)',
            $t->platform ?: '—',
            $t->device_name ?: '—',
            $t->failures,
            $t->last_used_at?->diffForHumans() ?? 'never',
        ]);

        if ($rows->isEmpty()) {
            $this->warn('No devices are registered yet.');

            return self::SUCCESS;
        }

        $this->table(['customer', 'platform', 'device', 'failures', 'last used'], $rows);

        return self::SUCCESS;
    }
}
