<?php

namespace App\Mail;

use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;

/** Tells the admins that sign-in codes are being refused to a whole group. */
class SignInBudgetAlarm extends Mailable
{
    public function __construct(public readonly string $group) {}

    public function envelope(): Envelope
    {
        return new Envelope(subject: 'Freshness: sign-in codes are being refused');
    }

    public function content(): Content
    {
        $group = e($this->group);

        return new Content(htmlString: <<<HTML
            <p>The hourly budget of sign-in codes for <b>{$group}</b> is full, so codes are being refused until it resets.</p>
            <p>This is usually someone flooding the sign-up or sign-in form. Check the server log; if it keeps happening,
            put a CAPTCHA (for example Cloudflare Turnstile) in front of the forms.</p>
            HTML);
    }
}
