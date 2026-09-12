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
            // Per email address, per hour.
            'per_email_hourly' => env('OTP_PER_EMAIL_HOURLY', 5),
            // Per client IP, per hour.
            'per_ip_hourly' => env('OTP_PER_IP_HOURLY', 15),
            // Whole system, per hour. The backstop against someone using the
            // signup endpoint to send mail on our behalf; if this trips, it is
            // an incident, not a busy day.
            'global_hourly' => env('OTP_GLOBAL_HOURLY', 500),
        ],
    ],

    'support' => [
        'phone' => env('SUPPORT_PHONE', '+994503521919'),
        'whatsapp' => env('SUPPORT_WHATSAPP', '994503521919'),
        'instagram' => env('SUPPORT_INSTAGRAM', 'freshness_to_your_home'),
    ],
];
