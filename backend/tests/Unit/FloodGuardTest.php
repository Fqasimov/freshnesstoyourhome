<?php

namespace Tests\Unit;

use App\Support\FloodGuard;
use PHPUnit\Framework\TestCase;

/**
 * The pre-boot flood guard. Plain PHPUnit, no framework: the guard runs before
 * Laravel exists, so it must work without it.
 */
class FloodGuardTest extends TestCase
{
    private string $dir;

    protected function setUp(): void
    {
        $this->dir = sys_get_temp_dir().'/flood-guard-'.bin2hex(random_bytes(6));
    }

    protected function tearDown(): void
    {
        if (! is_dir($this->dir)) {
            return;
        }
        foreach (array_merge(glob($this->dir.'/*') ?: [], glob($this->dir.'/.keep') ?: []) as $f) {
            unlink($f);
        }
        rmdir($this->dir);
    }

    /** Requests from one client at one instant; returns the last answer. */
    private function hit(string $ip, int $times, int $now): ?int
    {
        $answer = null;
        for ($i = 0; $i < $times; $i++) {
            $answer = FloodGuard::check($ip, $this->dir, $now);
        }

        return $answer;
    }

    public function test_a_person_is_never_stopped(): void
    {
        // Opening the app, browsing, checking out: well inside every window.
        $this->assertNull($this->hit('203.0.113.5', 30, 1_000_000));
    }

    public function test_a_burst_past_the_short_window_is_turned_away(): void
    {
        [$window, $max] = FloodGuard::LIMITS[0];
        $now = 1_000_000 - (1_000_000 % $window);

        $this->assertNull($this->hit('203.0.113.6', $max, $now));
        $this->assertSame(FloodGuard::BLOCK_SECONDS, FloodGuard::check('203.0.113.6', $this->dir, $now));
    }

    public function test_a_steady_flood_past_the_minute_is_turned_away(): void
    {
        $start = 1_000_020 - (1_000_020 % 60);
        $answer = null;

        // Just under the short window each time, but too many for the minute.
        for ($s = 0; $s < 60 && $answer === null; $s += 10) {
            $answer = $this->hit('203.0.113.7', 25, $start + $s);
        }

        $this->assertSame(FloodGuard::BLOCK_SECONDS, $answer);
    }

    public function test_a_blocked_client_waits_its_time_and_is_then_let_back(): void
    {
        $now = 1_000_000;
        $this->hit('203.0.113.8', 200, $now);

        $this->assertSame(FloodGuard::BLOCK_SECONDS - 100, FloodGuard::check('203.0.113.8', $this->dir, $now + 100));
        $this->assertNull(FloodGuard::check('203.0.113.8', $this->dir, $now + FloodGuard::BLOCK_SECONDS + 1));
    }

    public function test_knocking_while_blocked_does_not_extend_the_block(): void
    {
        $now = 1_000_000;
        $this->hit('203.0.113.9', 200, $now);
        $this->hit('203.0.113.9', 500, $now + 60);

        $this->assertNull(FloodGuard::check('203.0.113.9', $this->dir, $now + FloodGuard::BLOCK_SECONDS + 1));
    }

    public function test_one_client_flooding_does_not_touch_anyone_else(): void
    {
        $this->hit('198.51.100.1', 500, 1_000_000);

        $this->assertNull(FloodGuard::check('198.51.100.2', $this->dir, 1_000_000));
    }

    public function test_behind_cloudflare_the_visitor_is_counted_not_the_edge(): void
    {
        $viaCloudflare = ['REMOTE_ADDR' => '173.245.48.10', 'HTTP_CF_CONNECTING_IP' => '203.0.113.20'];

        $this->assertSame('203.0.113.20', FloodGuard::clientIp($viaCloudflare));
    }

    public function test_a_typed_cloudflare_header_from_anyone_else_is_ignored(): void
    {
        // A bot rotating a made-up header must still be counted by its own address.
        $spoofed = ['REMOTE_ADDR' => '198.51.100.66', 'HTTP_CF_CONNECTING_IP' => '203.0.113.21'];

        $this->assertSame('198.51.100.66', FloodGuard::clientIp($spoofed));
        $this->assertSame('198.51.100.66', FloodGuard::clientIp(['REMOTE_ADDR' => '198.51.100.66', 'HTTP_CF_CONNECTING_IP' => 'nonsense']));
    }

    public function test_it_fails_open_when_it_cannot_write(): void
    {
        $file = tempnam(sys_get_temp_dir(), 'flood');
        // A file where the directory should be: nothing can be created inside.
        $this->assertNull(FloodGuard::check('203.0.113.30', $file, 1_000_000));
        @unlink($file);
    }

    public function test_parallel_requests_are_all_counted(): void
    {
        if (! function_exists('pcntl_fork')) {
            $this->markTestSkipped('pcntl is not available.');
        }

        [$window, $max] = FloodGuard::LIMITS[0];
        $now = 2_000_000 - (2_000_000 % $window);
        $workers = 4;
        $each = intdiv($max, $workers);

        $pids = [];
        for ($w = 0; $w < $workers; $w++) {
            $pid = pcntl_fork();
            if ($pid === 0) {
                for ($i = 0; $i < $each; $i++) {
                    FloodGuard::check('203.0.113.40', $this->dir, $now);
                }
                exit(0);
            }
            $pids[] = $pid;
        }
        foreach ($pids as $pid) {
            pcntl_waitpid($pid, $status);
        }

        // Exactly $max counted between them, so the very next one is refused:
        // a lost update would have let it through.
        $this->assertSame(FloodGuard::BLOCK_SECONDS, FloodGuard::check('203.0.113.40', $this->dir, $now));
    }

    public function test_quiet_clients_are_swept_away(): void
    {
        FloodGuard::check('203.0.113.50', $this->dir, 1_000_000);
        $file = $this->dir.'/'.sha1('203.0.113.50');
        touch($file, 1_000_000);

        file_put_contents($this->dir.'/.keep', "keep\n");
        touch($this->dir.'/.keep', 1_000_000);

        FloodGuard::sweep($this->dir, 1_000_000 + FloodGuard::BLOCK_SECONDS + 3600);

        $this->assertFileDoesNotExist($file);
        $this->assertFileExists($this->dir.'/.keep');
    }
}
