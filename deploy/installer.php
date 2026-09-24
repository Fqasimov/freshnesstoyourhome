<?php
/**
 * Freshness To Your Home — one-time installer for hosts with no shell.
 *
 * The API normally sets itself up with `php artisan ...` over SSH. On a shared
 * cPanel account where shell access is switched off, this page does the same
 * work from a browser: it writes .env, generates the two keys, creates the
 * tables, seeds the catalogue and delivery areas, links the photo storage, and
 * promotes the first admin. Then it deletes itself.
 *
 * It is copied into backend/public/ under a random name by
 * scripts/package-deploy.sh, so its address is not guessable. It refuses to
 * overwrite an existing .env, and it stops working 48 hours after install
 * whether or not anyone remembered to delete it.
 *
 * Nothing in here is special: every step is the artisan command DEPLOY.md
 * describes, called through Laravel's own console kernel.
 */
declare(strict_types=1);

const DOMAIN = '__DOMAIN__';
// Where the API answers — https://DOMAIN/server here, since the host would
// not give it a subdomain of its own. Set by scripts/package-deploy.sh.
const API_URL = '__API_URL__';
const EXPIRES_AFTER = 48 * 3600;

// Either the standard layout (this file in backend/public/) or the split one
// this host needs (this file in a folder under public_html, the code in
// ~/freshness/backend) — see deploy/split-index.php.
$base = is_dir(dirname(__DIR__).'/vendor') ? dirname(__DIR__) : dirname(__DIR__, 2).'/freshness/backend';
$envPath = $base.'/.env';
$lockPath = $base.'/storage/installed.lock';

function h(?string $s): string { return htmlspecialchars((string) $s, ENT_QUOTES, 'UTF-8'); }

function kernel(string $base) {
    static $kernel = null;
    if ($kernel === null) {
        require $base.'/vendor/autoload.php';
        $app = require $base.'/bootstrap/app.php';
        // The served folder is this one, so storage:link must create its link here.
        $app->usePublicPath(__DIR__);
        $kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
        $kernel->bootstrap();
    }
    return $kernel;
}

/** Run an artisan command in-process; returns [exitCode, output]. */
function artisan(string $base, string $command, array $args = []): array {
    try {
        $k = kernel($base);
        $code = $k->call($command, $args + ['--no-interaction' => true]);
        return [$code, trim($k->output())];
    } catch (Throwable $e) {
        return [1, get_class($e).': '.$e->getMessage()];
    }
}

function envLine(string $key, string $value): string {
    // Quote anything with a space, # or quote, so a password never truncates.
    if ($value === '' || preg_match('/^[A-Za-z0-9_.:\/@+=,-]+$/', $value)) {
        return $key.'='.$value;
    }
    return $key.'="'.str_replace(['\\', '"'], ['\\\\', '\\"'], $value).'"';
}

// ── expiry ────────────────────────────────────────────────────────────────
if (is_file($lockPath) && time() - (int) filemtime($lockPath) > EXPIRES_AFTER) {
    @unlink(__FILE__);
    http_response_code(410);
    exit('Installer expired and removed itself.');
}

// ── pre-flight ────────────────────────────────────────────────────────────
$checks = [
    'PHP 8.2 or newer (have '.PHP_VERSION.')' => version_compare(PHP_VERSION, '8.2.0', '>='),
];
$checks['PHP extension: pdo_mysql or pdo_pgsql'] = extension_loaded('pdo_mysql') || extension_loaded('pdo_pgsql');
foreach (['mbstring', 'openssl', 'tokenizer', 'xml', 'ctype', 'fileinfo', 'curl'] as $ext) {
    $checks["PHP extension: $ext"] = extension_loaded($ext);
}
$checks['storage/ is writable'] = is_writable($base.'/storage');
$checks['bootstrap/cache/ is writable'] = is_writable($base.'/bootstrap/cache');
$checks['backend folder is writable (for .env)'] = is_writable($base) || is_file($envPath);
$checks['backend code found at '.$base] = is_file($base.'/vendor/autoload.php');
$checks['../shared/catalogue.json is present'] = is_file(dirname($base).'/shared/catalogue.json');
$https = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off')
    || (($_SERVER['HTTP_X_FORWARDED_PROTO'] ?? '') === 'https');
$allOk = !in_array(false, $checks, true);

$action = $_POST['action'] ?? '';
$log = [];
$error = null;
$keysShown = null;

// ── install ───────────────────────────────────────────────────────────────
if ($action === 'install' && !is_file($envPath) && $allOk) {
    $driver = ($_POST['db_driver'] ?? 'mysql') === 'pgsql' ? 'pgsql' : 'mysql';
    $db = [
        'host' => trim($_POST['db_host'] ?? 'localhost'),
        'port' => trim($_POST['db_port'] ?? '') ?: ($driver === 'pgsql' ? '5432' : '3306'),
        'name' => trim($_POST['db_name'] ?? ''),
        'user' => trim($_POST['db_user'] ?? ''),
        'pass' => (string) ($_POST['db_pass'] ?? ''),
    ];
    try {
        if (!extension_loaded('pdo_'.$driver)) {
            throw new RuntimeException("PHP extension pdo_$driver is not enabled — cPanel → Select PHP Version → Extensions, or choose the other database type.");
        }
        $dsn = $driver === 'pgsql'
            ? "pgsql:host={$db['host']};port={$db['port']};dbname={$db['name']}"
            : "mysql:host={$db['host']};port={$db['port']};dbname={$db['name']};charset=utf8mb4";
        new PDO($dsn, $db['user'], $db['pass'], [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION, PDO::ATTR_TIMEOUT => 5,
        ]);
    } catch (Throwable $e) {
        $error = 'Could not connect to the database: '.$e->getMessage();
    }

    if ($error === null) {
        $appKey = 'base64:'.base64_encode(random_bytes(32));
        $blind = base64_encode(random_bytes(32));
        $mailUser = trim($_POST['mail_user'] ?? '');

        $env = [
            '# Written by the one-time installer. Back up APP_KEY and BLIND_INDEX_KEY',
            '# somewhere that is not this server — losing either is unrecoverable.',
            envLine('APP_NAME', 'Freshness To Your Home'),
            'APP_ENV=production',
            envLine('APP_KEY', $appKey),
            'APP_DEBUG=false',
            envLine('APP_URL', API_URL),
            'APP_TIMEZONE=Asia/Baku',
            'APP_LOCALE=az',
            envLine('BLIND_INDEX_KEY', $blind),
            '',
            'DB_CONNECTION='.$driver,
            envLine('DB_HOST', $db['host']),
            envLine('DB_PORT', $db['port']),
            envLine('DB_DATABASE', $db['name']),
            envLine('DB_USERNAME', $db['user']),
            envLine('DB_PASSWORD', $db['pass']),
            '',
            'MAIL_MAILER=smtp',
            'MAIL_SCHEME=smtps',
            envLine('MAIL_HOST', trim($_POST['mail_host'] ?? 'mail.'.DOMAIN)),
            envLine('MAIL_PORT', trim($_POST['mail_port'] ?? '465')),
            envLine('MAIL_USERNAME', $mailUser),
            envLine('MAIL_PASSWORD', (string) ($_POST['mail_pass'] ?? '')),
            envLine('MAIL_FROM_ADDRESS', $mailUser),
            'MAIL_FROM_NAME="Freshness To Your Home"',
            '',
            '# No shell, so no long-running worker: mail and pushes go out inside',
            '# the request. Fine at this volume; switch to database + a cron worker',
            '# if sign-in ever feels slow.',
            'QUEUE_CONNECTION=sync',
            'CACHE_STORE=database',
            'SESSION_DRIVER=database',
            'SESSION_SECURE_COOKIE=true',
            '',
            envLine('CORS_ALLOWED_ORIGINS', 'https://'.DOMAIN.',https://www.'.DOMAIN),
            'TRUSTED_PROXIES=*',
            '',
            'ORDER_LEAD_DAYS=1',
            'DELIVERY_OPEN=10:00',
            'DELIVERY_CLOSE=22:00',
            'WEIGHT_TOLERANCE_PERCENT=10',
            'OTP_PER_EMAIL_HOURLY=5',
            'OTP_PER_IP_HOURLY=15',
            'OTP_GLOBAL_HOURLY=500',
            'SUPPORT_PHONE="+994503521919"',
            'SUPPORT_WHATSAPP="994503521919"',
            'SUPPORT_INSTAGRAM="freshness_to_your_home"',
            '',
            'LOG_CHANNEL=stack',
            'LOG_STACK=daily',
            'LOG_LEVEL=warning',
        ];

        if (@file_put_contents($envPath, implode("\n", $env)."\n") === false) {
            $error = 'Could not write .env — check that the backend folder is writable.';
        } else {
            @chmod($envPath, 0600);
            foreach ([
                ['migrate', ['--force' => true]],
                ['db:seed', ['--force' => true]],
                ['storage:link', []],
            ] as [$cmd, $args]) {
                [$code, $out] = artisan($base, $cmd, $args);
                $log[] = ['cmd' => $cmd, 'ok' => $code === 0, 'out' => $out];
            }
            if ($log[0]['ok'] && $log[1]['ok']) {
                @file_put_contents($lockPath, date('c'));
                $keysShown = ['APP_KEY' => $appKey, 'BLIND_INDEX_KEY' => $blind];
            } else {
                $error = 'Setup did not finish — see the output below. The .env was kept; fix the cause and use "Retry setup".';
            }
        }
    }
}

// ── retry (after a partial install) ─────────────────────────────────────────
if ($action === 'retry' && is_file($envPath) && !is_file($lockPath)) {
    foreach ([['migrate', ['--force' => true]], ['db:seed', ['--force' => true]], ['storage:link', []]] as [$cmd, $args]) {
        [$code, $out] = artisan($base, $cmd, $args);
        $log[] = ['cmd' => $cmd, 'ok' => $code === 0, 'out' => $out];
    }
    if ($log[0]['ok'] && $log[1]['ok']) {
        @file_put_contents($lockPath, date('c'));
    }
}

// ── test mail / promote / finish ──────────────────────────────────────────
if ($action === 'testmail' && is_file($lockPath)) {
    [$code, $out] = artisan($base, 'freshness:mail-test', ['email' => trim($_POST['email'] ?? '')]);
    $log[] = ['cmd' => 'mail test', 'ok' => $code === 0, 'out' => $out];
}
$promoted = false;
if ($action === 'promote' && is_file($lockPath)) {
    [$code, $out] = artisan($base, 'freshness:promote', ['email' => trim($_POST['email'] ?? ''), 'role' => 'admin']);
    $log[] = ['cmd' => 'make admin', 'ok' => $code === 0, 'out' => $out];
    $promoted = $code === 0;
}
if ($action === 'finish' && is_file($lockPath)) {
    @unlink(__FILE__);
    exit('<p style="font:16px system-ui;padding:40px">Installer removed. The shop is at <a href="https://'.h(DOMAIN).'">'.h(DOMAIN).'</a>, the panel at <a href="https://'.h(DOMAIN).'/cms">'.h(DOMAIN).'/cms</a>.</p>');
}

$installed = is_file($lockPath);
$partial = is_file($envPath) && !$installed;
?><!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex,nofollow"><title>Freshness — installer</title>
<style>
 body{font:15px/1.5 system-ui,sans-serif;max-width:720px;margin:32px auto;padding:0 16px;color:#1B2916;background:#F6F3EA}
 h1{font-size:22px} h2{font-size:17px;margin-top:28px}
 .ok{color:#2C5121}.bad{color:#90452E;font-weight:600}
 label{display:block;margin:10px 0 4px;font-weight:600} input{width:100%;padding:9px;border:1px solid #bbb;border-radius:4px;font:inherit;box-sizing:border-box}
 button{margin-top:16px;padding:11px 18px;background:#245A2A;color:#fff;border:0;border-radius:4px;font:inherit;cursor:pointer}
 .box{background:#fff;border:1px solid #ddd;border-radius:6px;padding:16px;margin:14px 0}
 .warn{background:#FFF4D6;border-color:#E3C766} pre{white-space:pre-wrap;font-size:12px;background:#F0EDE4;padding:8px;border-radius:4px}
 code{background:#EFEADC;padding:1px 4px;border-radius:3px} small{color:#5F6955}
</style></head><body>
<h1>Freshness To Your Home — installer</h1>

<?php if (!$https): ?>
<div class="box warn"><b>This page is not on HTTPS.</b> Passwords you type here would travel unencrypted. Open it as <code><?= h(API_URL) ?>/…</code> once the SSL certificate is active, then continue.</div>
<?php endif; ?>

<?php if ($error): ?><div class="box warn bad"><?= h($error) ?></div><?php endif; ?>

<?php foreach ($log as $l): ?>
<div class="box"><b class="<?= $l['ok'] ? 'ok' : 'bad' ?>"><?= $l['ok'] ? '✓' : '✗' ?> <?= h($l['cmd']) ?></b><?php if ($l['out'] !== ''): ?><pre><?= h($l['out']) ?></pre><?php endif; ?></div>
<?php endforeach; ?>

<?php if ($keysShown): ?>
<div class="box warn">
 <b>Save these two keys now — in a password manager, not on this server.</b><br>
 They encrypt every customer's name, phone, email and address. If the server is ever lost or rebuilt without them, that data is gone for good. They are also in the server's .env, but that is not a backup.
 <pre>APP_KEY=<?= h($keysShown['APP_KEY']) ?>

BLIND_INDEX_KEY=<?= h($keysShown['BLIND_INDEX_KEY']) ?></pre>
</div>
<?php endif; ?>

<?php if (!$installed && !$partial): ?>
<h2>1. Checks</h2>
<div class="box"><?php foreach ($checks as $label => $ok): ?><div class="<?= $ok ? 'ok' : 'bad' ?>"><?= $ok ? '✓' : '✗' ?> <?= h($label) ?></div><?php endforeach; ?></div>
<?php if (!$allOk): ?><p class="bad">Fix the items marked ✗ first (cPanel → Select PHP Version for version and extensions), then reload this page.</p><?php endif; ?>

<?php if ($allOk): ?>
<h2>2. Database and mail</h2>
<form method="post">
 <input type="hidden" name="action" value="install">
 <div class="box">
  <b>Database</b> <small>— from cPanel → MySQL® Databases (or PostgreSQL Databases). cPanel adds your username as a prefix, e.g. <code>freshdcg_shop</code>.</small>
  <label>Type</label>
  <select name="db_driver" style="width:100%;padding:9px;border:1px solid #bbb;border-radius:4px;font:inherit">
   <option value="mysql">MySQL / MariaDB (cPanel → MySQL® Databases)</option>
   <option value="pgsql">PostgreSQL (cPanel → PostgreSQL Databases)</option>
  </select>
  <label>Database name</label><input name="db_name" required placeholder="freshdcg_shop">
  <label>Database user</label><input name="db_user" required placeholder="freshdcg_api">
  <label>Database password</label><input name="db_pass" type="password" required>
  <label>Host</label><input name="db_host" value="localhost">
  <label>Port</label><input name="db_port" value="" placeholder="leave empty — 3306 for MySQL, 5432 for PostgreSQL">
 </div>
 <div class="box">
  <b>Email for sign-in codes</b> <small>— an account from cPanel → Email Accounts, e.g. <code>hello@<?= h(DOMAIN) ?></code>. This is the only way anyone signs in, including you.</small>
  <label>Email address</label><input name="mail_user" required value="hello@<?= h(DOMAIN) ?>">
  <label>Email password</label><input name="mail_pass" type="password" required>
  <label>SMTP host</label><input name="mail_host" value="mail.<?= h(DOMAIN) ?>">
  <label>SMTP port</label><input name="mail_port" value="465">
 </div>
 <button>Install</button> <small>Takes up to a minute — creates the tables and loads 74 products and 51 delivery areas.</small>
</form>
<?php endif; ?>

<?php elseif ($partial): ?>
<h2>Setup did not finish</h2>
<p>The .env is written but the database step failed. Fix the cause shown above, then:</p>
<form method="post"><input type="hidden" name="action" value="retry"><button>Retry setup</button></form>

<?php else: ?>
<h2>Installed ✓</h2>
<div class="box">
 <b>Next — make yourself the admin:</b>
 <ol>
  <li>Open <a href="https://<?= h(DOMAIN) ?>/cms" target="_blank">https://<?= h(DOMAIN) ?>/cms</a> in a new tab.</li>
  <li>Enter your email, get the code by email, sign in. It will say you are not an admin — that is expected, the account now exists.</li>
  <li>Come back to this tab and enter the same email below.</li>
 </ol>
 <form method="post"><input type="hidden" name="action" value="promote">
  <label>Your email</label><input name="email" type="email" required>
  <button>Make admin</button></form>
</div>
<div class="box">
 <b>No code arriving?</b> Send a test email first:
 <form method="post"><input type="hidden" name="action" value="testmail">
  <label>Send a test to</label><input name="email" type="email" required>
  <button>Send test</button></form>
</div>
<?php if ($promoted): ?>
<div class="box"><b class="ok">You are admin.</b> Sign in again at <a href="https://<?= h(DOMAIN) ?>/cms">/cms</a>. Then remove this installer:
 <form method="post"><input type="hidden" name="action" value="finish"><button>Finish and delete installer</button></form></div>
<?php endif; ?>
<?php endif; ?>
</body></html>
