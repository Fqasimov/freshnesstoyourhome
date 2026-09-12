<?php

namespace App\Console\Commands;

use App\Mail\LoginCodeMail;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Mail;
use Throwable;

/**
 * Send a real sign-in email, to prove the mail path works.
 *
 * Mail is the only way into this app. If Resend is misconfigured, the domain
 * is unverified, or the queue worker is not running, every customer is locked
 * out and the API reports nothing wrong — `request-code` answers 200 either
 * way, by design, because it must not reveal whether an address exists.
 *
 * So this is the check that closes that gap. Run it after every deploy that
 * touches mail, and before launch.
 */
class MailTest extends Command
{
    protected $signature = 'freshness:mail-test {email : Where to send it}
        {--lang=az : az, ru or en}
        {--now : Send inline instead of queueing, to see errors immediately}';

    protected $description = 'Send a test sign-in email and report what happened';

    public function handle(): int
    {
        $to = (string) $this->argument('email');
        $lang = (string) $this->option('lang');

        if (! filter_var($to, FILTER_VALIDATE_EMAIL)) {
            $this->error("[{$to}] is not a valid email address.");

            return self::FAILURE;
        }

        $mailer = config('mail.default');
        $from = config('mail.from.address');

        $this->newLine();
        $this->line('  mailer   '.$mailer);
        $this->line('  from     '.$from);
        $this->line('  to       '.$to);
        $this->line('  queue    '.config('queue.default'));
        $this->newLine();

        if ($mailer === 'resend' && blank(config('services.resend.key'))) {
            $this->error('RESEND_API_KEY is empty. Nothing will send.');

            return self::FAILURE;
        }

        if ($mailer === 'log') {
            $this->warn('MAIL_MAILER=log — this writes to storage/logs/laravel.log '.
                'rather than sending. Fine locally; wrong in production.');
        }

        // A recognisable, obviously-fake code: nobody should be able to use a
        // test email to sign in.
        $mail = new LoginCodeMail('000000', $lang);

        try {
            if ($this->option('now')) {
                Mail::to($to)->send($mail);
                $this->info('Sent inline. Check the inbox — and the spam folder.');
            } else {
                Mail::to($to)->queue($mail);
                $this->info('Queued.');
                $this->warn('A queue worker must be running or this never leaves: '.
                    'php artisan queue:work');
            }
        } catch (Throwable $e) {
            $this->newLine();
            $this->error('Send failed: '.$e->getMessage());
            $this->newLine();
            $this->line('Usual causes:');
            $this->line('  - the sending domain is not verified in Resend');
            $this->line('  - MAIL_FROM_ADDRESS is on a domain Resend does not know');
            $this->line('  - the API key is for the wrong Resend account');

            return self::FAILURE;
        }

        $this->newLine();
        $this->comment('If it does not arrive, check SPF, DKIM and DMARC on '.
            parse_url('//'.substr(strrchr((string) $from, '@') ?: '', 1), PHP_URL_HOST).
            ' before anything else.');
        $this->newLine();

        return self::SUCCESS;
    }
}
