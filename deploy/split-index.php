<?php

/**
 * The API's front door, for a host that keeps every domain inside public_html.
 *
 * cPanel on this account will only point a domain at a folder under
 * public_html, but the backend must not live there: .env holds the database
 * password and the encryption keys, and anything under public_html can be
 * requested by URL. So the code sits in ~/freshness/backend, outside the web
 * root, and only this file (with .htaccess, favicon and robots.txt) sits in
 * public_html/api.DOMAIN. It is Laravel's own public/index.php with the paths
 * pointed two levels up and across.
 *
 * Copied into place by scripts/package-deploy.sh.
 */

use Illuminate\Foundation\Application;
use Illuminate\Http\Request;

define('LARAVEL_START', microtime(true));

$backend = dirname(__DIR__, 2).'/freshness/backend';

if (file_exists($maintenance = $backend.'/storage/framework/maintenance.php')) {
    require $maintenance;
}

require $backend.'/vendor/autoload.php';

/** @var Application $app */
$app = require_once $backend.'/bootstrap/app.php';

// This folder, not ~/freshness/backend/public, is what the web server serves —
// the storage link and every generated asset path have to land here.
$app->usePublicPath(__DIR__);

$app->handleRequest(Request::capture());
