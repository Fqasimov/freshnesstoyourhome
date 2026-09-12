<?php

/**
 * Cross-origin rules.
 *
 * The mobile app is not a browser origin and is unaffected by any of this —
 * these rules exist for the website, which calls the same API from a real
 * origin and is therefore subject to the browser's checks.
 *
 * `allowed_origins` is an explicit list, never '*'. A wildcard here would let
 * any site on the internet make authenticated calls on a visitor's behalf if
 * credentials were ever enabled, and tells the browser not to bother
 * protecting anyone. The list is configuration, so adding a staging domain does
 * not need a code change.
 */
return [
    'paths' => ['api/*'],

    'allowed_methods' => ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],

    'allowed_origins' => array_values(array_filter(
        array_map('trim', explode(',', (string) env('CORS_ALLOWED_ORIGINS', '')))
    )),

    /**
     * Local development only.
     *
     * A phone on the same wifi reaches the dev server at the machine's LAN
     * address, so the browser sends an origin like http://192.168.1.14:5174 —
     * which no fixed list can predict. These patterns cover private address
     * ranges and localhost, and only outside production, so the exact-match
     * list above remains the whole of the rule on a real deployment.
     */
    'allowed_origins_patterns' => env('APP_ENV') === 'production' ? [] : [
        '#^http://localhost(:\d+)?$#',
        '#^http://127\.0\.0\.1(:\d+)?$#',
        '#^http://192\.168\.\d{1,3}\.\d{1,3}(:\d+)?$#',
        '#^http://10\.\d{1,3}\.\d{1,3}\.\d{1,3}(:\d+)?$#',
        '#^http://172\.(1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3}(:\d+)?$#',
    ],

    'allowed_headers' => ['Accept', 'Authorization', 'Content-Type', 'X-Requested-With'],

    'exposed_headers' => [],

    'max_age' => 3600,

    /**
     * False, and it must stay false.
     *
     * This API authenticates with a bearer token that the client attaches
     * deliberately, not with a cookie the browser attaches automatically.
     * Because no credential rides along on a cross-site request, there is no
     * CSRF surface at all. Turning this on would create one.
     */
    'supports_credentials' => false,
];
