<?php

namespace Tests\Feature;

use Illuminate\Support\Facades\Route;
use Tests\TestCase;

/**
 * Whose word to take for the client's IP.
 *
 * Every per-IP rate limit — sign-in codes, code guesses, the panel's door —
 * counts by $request->ip(). If any visitor can set it with a header, those
 * limits count whatever the attacker writes. Booted fresh per case, because
 * the proxy list is read once when the application is built.
 */
class TrustedProxyTest extends TestCase
{
    private function ipSeen(array $server): string
    {
        Route::get('/_ip', fn () => request()->ip());

        return $this->withServerVariables($server)->get('/_ip')->getContent();
    }

    private function bootWith(?string $trusted): void
    {
        $trusted === null ? putenv('TRUSTED_PROXIES') : putenv('TRUSTED_PROXIES='.$trusted);
        $_ENV['TRUSTED_PROXIES'] = $_SERVER['TRUSTED_PROXIES'] = $trusted;
        if ($trusted === null) {
            unset($_ENV['TRUSTED_PROXIES'], $_SERVER['TRUSTED_PROXIES']);
        }
        $this->refreshApplication();
    }

    protected function tearDown(): void
    {
        putenv('TRUSTED_PROXIES');
        unset($_ENV['TRUSTED_PROXIES'], $_SERVER['TRUSTED_PROXIES']);
        parent::tearDown();
    }

    public function test_a_forged_forwarded_for_header_is_ignored_by_default(): void
    {
        $this->bootWith(null);

        $this->assertSame('203.0.113.9', $this->ipSeen([
            'REMOTE_ADDR' => '203.0.113.9',
            'HTTP_X_FORWARDED_FOR' => '1.2.3.4',
        ]));
    }

    public function test_behind_cloudflare_the_header_counts_only_from_cloudflare(): void
    {
        $this->bootWith('cloudflare');

        // From a Cloudflare edge: believed.
        $this->assertSame('198.51.100.7', $this->ipSeen([
            'REMOTE_ADDR' => '172.64.1.1',
            'HTTP_X_FORWARDED_FOR' => '198.51.100.7',
        ]));

        // Straight at the origin, pretending: not believed.
        $this->assertSame('203.0.113.9', $this->ipSeen([
            'REMOTE_ADDR' => '203.0.113.9',
            'HTTP_X_FORWARDED_FOR' => '1.2.3.4',
        ]));
    }
}
