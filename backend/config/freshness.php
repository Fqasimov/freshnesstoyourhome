<?php

/**
 * Business rules and secrets for Freshness To Your Home.
 *
 * Anything a shop owner might reasonably want to change lives here or in the
 * database — never inline in a controller, and never in the mobile bundle,
 * where changing it would mean an App Store review.
 */
return [
    // Separate from APP_KEY on purpose. See App\Support\BlindIndex.
    'blind_index_key' => env('BLIND_INDEX_KEY'),

    'currency' => 'AZN',

    'order' => [
        // Orders are taken a day ahead, as the business requires.
        'lead_days' => env('ORDER_LEAD_DAYS', 1),
        'delivery_open' => env('DELIVERY_OPEN', '10:00'),
        'delivery_close' => env('DELIVERY_CLOSE', '22:00'),
        'max_days_ahead' => env('ORDER_MAX_DAYS_AHEAD', 14),

        // A basket may hold at most this many distinct lines, and each line at
        // most this quantity. Not a business rule so much as a bound on what a
        // single request can ask the server to price.
        'max_lines' => 60,
        'max_qty_per_line' => 99,

        // Website orders need no account, so a per-IP limit is the only brake
        // per source — and many sources are cheap. This caps the day for
        // everyone together, so the panel cannot be buried in invented orders.
        // Past it the website still opens WhatsApp, just without an order code.
        'web_daily_cap' => env('WEB_ORDERS_DAILY', 150),

        /**
         * Weighed goods.
         *
         * A line sold by the kilo is an estimate until the courier weighs it.
         * The customer is told the estimate may move by up to this much either
         * way; anything beyond it needs the customer to agree before the sale
         * completes, rather than being silently charged.
         */
        'weight_tolerance_percent' => env('WEIGHT_TOLERANCE_PERCENT', 10),
    ],

    /*
     * "Sign in with Google / Apple" in the app. Each is a comma-separated
     * list of the client ids a token may be issued for — ours, and nobody
     * else's. Left empty, that button is refused by the server.
     *
     *  GOOGLE_CLIENT_IDS  the Web, Android and iOS OAuth client ids from
     *                     Google Cloud → APIs & Services → Credentials
     *  APPLE_CLIENT_IDS   the iOS bundle id: az.freshnesstoyourhome.app
     */
    'social' => [
        'google' => array_values(array_filter(array_map('trim', explode(',', (string) env('GOOGLE_CLIENT_IDS', ''))))),
        'apple' => array_values(array_filter(array_map('trim', explode(',', (string) env('APPLE_CLIENT_IDS', ''))))),
    ],

    'mail' => [
        // The admin panel's sign-in codes can come from their own address, so
        // staff and customers each get mail from a sender that fits. Unset, the
        // panel uses the shop's address (MAIL_FROM_ADDRESS) like everything else.
        // Must be on the domain verified in Resend.
        'panel_from' => env('PANEL_MAIL_FROM_ADDRESS') ? [
            'address' => env('PANEL_MAIL_FROM_ADDRESS'),
            'name' => env('PANEL_MAIL_FROM_NAME', 'Freshness Panel'),
        ] : null,
    ],

    'auth' => [
        // Six digits is what customers will tolerate typing. The security
        // comes from the short life and the attempt cap, not the length.
        'code_length' => 6,
        'code_ttl_minutes' => env('LOGIN_CODE_TTL', 10),
        'max_attempts' => env('LOGIN_CODE_MAX_ATTEMPTS', 5),

        // Access tokens are long-lived because the alternative on mobile is
        // asking a customer to check their email every time they open the app.
        // Revocation on logout and on account deletion is what bounds this.
        'token_ttl_days' => env('AUTH_TOKEN_TTL_DAYS', 60),

        'throttle' => [
            // Per email address, per hour. Also the bound on guessing: each
            // code is a fresh chance at the account, so keep this low. (For
            // the panel it is counted per address and source IP.)
            'per_email_hourly' => env('OTP_PER_EMAIL_HOURLY', 5),
            // The panel's ceiling per address from anywhere. Higher, because
            // locking the admin out costs the shop its orders, and a guessed
            // panel code only reaches the authenticator-app step.
            'panel_per_email_hourly' => env('OTP_PANEL_PER_EMAIL_HOURLY', 60),
            // Per client IP, per hour.
            'per_ip_hourly' => env('OTP_PER_IP_HOURLY', 15),
            // Whole system, per hour — counted separately for addresses with
            // an account and for new ones. The backstop against someone using
            // the signup endpoint to send mail on our behalf; if this trips,
            // the admins are mailed: it is an incident, not a busy day.
            'global_hourly' => env('OTP_GLOBAL_HOURLY', 500),
        ],
    ],

    /**
     * Who may open the admin panel.
     *
     * Named here, in the server's .env, and nowhere else. Signing in to /cms
     * with any other address sends nothing and creates nothing, so the panel
     * is not a second way to register. Changing this list needs access to
     * the server's files — the same bar as appointing staff always had, so a
     * leaked panel session still cannot make anybody else an admin.
     *
     * Empty means nobody: the panel fails closed.
     */
    'admin' => [
        'emails' => array_values(array_filter(array_map(
            fn (string $e) => strtolower(trim($e)),
            explode(',', (string) env('ADMIN_EMAILS', '')),
        ))),

        // A panel session lasts a working day, not the sixty days a customer's
        // phone keeps its token. A forgotten tab on a shared computer closes
        // itself overnight.
        'token_ttl_hours' => env('ADMIN_TOKEN_TTL_HOURS', 12),
    ],

    // Lets .github/workflows/deploy.yml run migrations after an FTP upload.
    // Unset (or under 32 characters) means the endpoint does not exist.
    'deploy_token' => env('DEPLOY_TOKEN'),

    'support' => [
        'phone' => env('SUPPORT_PHONE', '+994503521919'),
        'whatsapp' => env('SUPPORT_WHATSAPP', '994503521919'),
        'instagram' => env('SUPPORT_INSTAGRAM', 'freshness_to_your_home'),
    ],
];
