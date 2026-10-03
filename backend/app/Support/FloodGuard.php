<?php

namespace App\Support;

use Symfony\Component\HttpFoundation\IpUtils;

/**
 * The first thing every API request meets, before Laravel boots.
 *
 * A rate limit inside Laravel still costs a full boot and a database write per
 * request it refuses, so a flood refused there can still take the server
 * down — on shared hosting, a few hundred requests a second is enough. This
 * counts each client in a small locked file and turns it away while it is
 * still cheap: no framework, no database, a stat and a few bytes.
 *
 * It answers one question — is a single source sending far more than any
 * person could — and leaves everything finer (sign-in budgets, order limits)
 * to the named limiters in AppServiceProvider. A flood spread over thousands
 * of addresses gets past any per-address count; that is the edge's job
 * (Cloudflare), described in DEPLOY.md.
 *
 * Fails open: if the directory cannot be written, the request goes through.
 * Refusing everybody because a disk is full would be its own outage.
 */
final class FloodGuard
{
    /**
     * [window in seconds, most requests allowed in it] per client address.
     * Opening the app is about five requests; a busy admin page a dozen.
     * Generous enough for a mobile carrier's shared address, nothing like a
     * bot's rate.
     */
    public const LIMITS = [
        [10, 40],
        [60, 120],
    ];

    /** How long a client that trips a limit waits. */
    public const BLOCK_SECONDS = 300;

    /** Roughly one request in this many tidies up the counters of quiet clients. */
    private const SWEEP_ONE_IN = 500;

    /** Called from public/index.php. Ends the request with a 429 if it must. */
    public static function enforce(array $server, string $dir): void
    {
        try {
            $wait = self::check(self::clientIp($server), $dir, time());
        } catch (\Throwable) {
            return;
        }

        if ($wait === null) {
            return;
        }

        http_response_code(429);
        header('Retry-After: '.$wait);
        header('Content-Type: application/json');
        header('Cache-Control: no-store');
        echo '{"message":"Too many requests. Please wait a few minutes and try again."}';
        exit;
    }

    /**
     * The address to count. Behind Cloudflare every connection comes from
     * Cloudflare, and the visitor's own address is in CF-Connecting-IP — which
     * Cloudflare sets and overwrites, so it is believed only on a connection
     * that really comes from Cloudflare. Anyone else typing that header is
     * counted by their own address.
     */
    public static function clientIp(array $server): string
    {
        $remote = (string) ($server['REMOTE_ADDR'] ?? '');
        $forwarded = trim((string) ($server['HTTP_CF_CONNECTING_IP'] ?? ''));

        if ($forwarded !== ''
            && filter_var($forwarded, FILTER_VALIDATE_IP) !== false
            && filter_var($remote, FILTER_VALIDATE_IP) !== false
            && IpUtils::checkIp($remote, CloudflareIps::ALL)) {
            return $forwarded;
        }

        return $remote;
    }

    /** Seconds the client must wait, or null to let the request through. */
    public static function check(string $ip, string $dir, int $now): ?int
    {
        if ($ip === '' || ! self::ready($dir)) {
            return null;
        }

        $handle = @fopen($dir.'/'.sha1($ip), 'c+');
        if ($handle === false) {
            return null;
        }

        try {
            // One request at a time per client, so a burst of parallel
            // requests cannot all read the same count and all slip through.
            if (! flock($handle, LOCK_EX)) {
                return null;
            }

            $state = json_decode((string) stream_get_contents($handle), true);
            $state = is_array($state) ? $state : [];

            // Already waiting out a block: refuse without counting, so a
            // client that keeps knocking is not kept out for ever.
            if (($state['until'] ?? 0) > $now) {
                return $state['until'] - $now;
            }

            $wait = null;
            foreach (self::LIMITS as [$window, $max]) {
                $start = $now - ($now % $window);
                $count = (($state['w'.$window][0] ?? null) === $start) ? $state['w'.$window][1] + 1 : 1;
                $state['w'.$window] = [$start, $count];

                if ($count > $max) {
                    $wait = self::BLOCK_SECONDS;
                }
            }

            if ($wait !== null) {
                $state['until'] = $now + $wait;
            }

            ftruncate($handle, 0);
            rewind($handle);
            fwrite($handle, (string) json_encode($state));
            fflush($handle);

            return $wait;
        } finally {
            flock($handle, LOCK_UN);
            fclose($handle);

            if (random_int(1, self::SWEEP_ONE_IN) === 1) {
                self::sweep($dir, $now);
            }
        }
    }

    /** Forget clients that have been quiet longer than any window or block. */
    public static function sweep(string $dir, int $now): void
    {
        $stale = $now - self::BLOCK_SECONDS - max(array_column(self::LIMITS, 0));

        // Counter files only — named by a hash — never anything placed there
        // on purpose, like the .keep a deploy leaves.
        foreach (glob($dir.'/*') ?: [] as $file) {
            if (preg_match('/^[0-9a-f]{40}$/', basename($file)) && @filemtime($file) < $stale) {
                @unlink($file);
            }
        }
    }

    private static function ready(string $dir): bool
    {
        if (is_dir($dir)) {
            return true;
        }

        // Something else in the way (a file of that name): give up, open.
        if (file_exists($dir)) {
            return false;
        }

        // Two first requests may race to create it; either way it exists.
        return @mkdir($dir, 0700, true) || is_dir($dir);
    }
}
