<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class LoginCodeMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public readonly string $code,
        // Named `lang`, not `locale`: Mailable already declares a
        // `$locale` property and redeclaring it as readonly is a fatal error.
        public readonly string $lang = 'az',
    ) {}

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: $this->subjectFor($this->lang),
        );
    }

    public function content(): Content
    {
        return new Content(
            markdown: 'mail.login-code',
            with: [
                'code' => $this->code,
                'minutes' => (int) config('freshness.auth.code_ttl_minutes'),
                'strings' => $this->stringsFor($this->lang),
            ],
        );
    }

    private function subjectFor(string $locale): string
    {
        return match ($locale) {
            'ru' => 'Ваш код входа — Freshness To Your Home',
            'en' => 'Your sign-in code — Freshness To Your Home',
            default => 'Giriş kodunuz — Freshness To Your Home',
        };
    }

    /**
     * Azerbaijani is the default because that is the language the shop's
     * customers use, and the app opens in it.
     */
    private function stringsFor(string $locale): array
    {
        return match ($locale) {
            'ru' => [
                'greeting' => 'Здравствуйте!',
                'intro' => 'Введите этот код в приложении, чтобы войти:',
                'expiry' => 'Код действует :minutes минут и используется один раз.',
                'ignore' => 'Если вы не запрашивали вход, просто проигнорируйте это письмо — ваш аккаунт в безопасности.',
                'never' => 'Мы никогда не спросим этот код по телефону или в переписке.',
            ],
            'en' => [
                'greeting' => 'Hello,',
                'intro' => 'Enter this code in the app to sign in:',
                'expiry' => 'It is valid for :minutes minutes and can be used once.',
                'ignore' => 'If you did not ask to sign in, ignore this email — your account is safe.',
                'never' => 'We will never ask you for this code by phone or message.',
            ],
            default => [
                'greeting' => 'Salam!',
                'intro' => 'Daxil olmaq üçün bu kodu tətbiqdə yazın:',
                'expiry' => 'Kod :minutes dəqiqə etibarlıdır və bir dəfə istifadə olunur.',
                'ignore' => 'Əgər girişi siz istəməmisinizsə, bu məktubu nəzərə almayın — hesabınız təhlükəsizdir.',
                'never' => 'Biz bu kodu heç vaxt telefonla və ya mesajla soruşmuruq.',
            ],
        };
    }
}
