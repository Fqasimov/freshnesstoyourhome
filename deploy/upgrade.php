<?php
/**
 * One-time database upgrade, for hosting with no shell.
 *
 * A new backend.zip can bring new migrations, and on a cPanel account with
 * the shell switched off there is nowhere to type `php artisan migrate`. This
 * page is that command behind a button. It only runs on an installed site,
 * only runs migrations, and deletes itself once they have gone through.
 * Its file name carries 24 random hex characters; the API folder's .htaccess
 * refuses every other .php file.
 */
declare(strict_types=1);

$base = is_dir(dirname(__DIR__).'/vendor') ? dirname(__DIR__) : dirname(__DIR__, 2).'/freshness/backend';

header('X-Robots-Tag: noindex, nofollow');
header('X-Frame-Options: DENY');
header('Cache-Control: no-store');
header("Content-Security-Policy: default-src 'none'; style-src 'unsafe-inline'; form-action 'self'");

if (!is_file($base.'/.env') || !is_file($base.'/storage/installed.lock')) {
    http_response_code(404);
    exit('Not found');
}

function h(?string $s): string { return htmlspecialchars((string) $s, ENT_QUOTES, 'UTF-8'); }

function artisan(string $base, string $command, array $args = []): array {
    try {
        require_once $base.'/vendor/autoload.php';
        $app = require $base.'/bootstrap/app.php';
        $app->usePublicPath(__DIR__);
        $kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
        $kernel->bootstrap();
        $code = $kernel->call($command, $args + ['--no-interaction' => true]);
        return [$code, trim($kernel->output())];
    } catch (Throwable $e) {
        return [1, get_class($e).': '.$e->getMessage()];
    }
}

$ran = null;
if (($_SERVER['REQUEST_METHOD'] ?? '') === 'POST') {
    [$code, $out] = artisan($base, 'migrate', ['--force' => true]);
    $ran = ['ok' => $code === 0, 'out' => $out];
    if ($ran['ok']) {
        @unlink(__FILE__);
    }
}
?><!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Freshness — database update</title>
<style>body{font:16px/1.5 system-ui,sans-serif;max-width:640px;margin:40px auto;padding:0 16px}
pre{background:#f4f4f4;padding:12px;overflow:auto;font-size:13px}.ok{color:#176b2c}.bad{color:#b3261e}
button{font:inherit;padding:10px 18px;border:0;border-radius:6px;background:#1f4d3a;color:#fff;cursor:pointer}</style>
</head><body>
<h1>Database update</h1>
<?php if ($ran === null): ?>
<p>The new code needs a few database changes. They add to the existing tables; no products, orders or customers are removed.</p>
<form method="post"><button>Run the update</button></form>
<?php elseif ($ran['ok']): ?>
<p class="ok"><b>Done.</b> This page has deleted itself. You can close it.</p>
<pre><?= h($ran['out']) ?></pre>
<?php else: ?>
<p class="bad"><b>The update did not finish.</b> Nothing was lost; send the text below to whoever set up the site, then reload this page to try again.</p>
<pre><?= h($ran['out']) ?></pre>
<?php endif; ?>
</body></html>
