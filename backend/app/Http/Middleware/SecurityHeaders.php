<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Response headers that cost nothing and close whole categories of attack.
 *
 * This API serves JSON to a mobile app and a website; it renders no HTML of
 * its own except Laravel's error pages. The headers are still worth setting:
 * a JSON endpoint that can be framed, sniffed as HTML, or made to leak a
 * referer is a JSON endpoint somebody will find a use for.
 */
class SecurityHeaders
{
    public function handle(Request $request, Closure $next): Response
    {
        $response = $next($request);

        // Stops a browser from second-guessing Content-Type. Without it, a
        // JSON response containing attacker-chosen text can be coaxed into
        // being treated as HTML, and from there as script.
        $response->headers->set('X-Content-Type-Options', 'nosniff');

        // Nothing here is meant to be displayed inside someone else's page.
        $response->headers->set('X-Frame-Options', 'DENY');
        $response->headers->set('Referrer-Policy', 'no-referrer');

        // This API has no need of a camera, a microphone or a location.
        $response->headers->set(
            'Permissions-Policy',
            'accelerometer=(), camera=(), geolocation=(), gyroscope=(), magnetometer=(), microphone=(), payment=(), usb=()'
        );

        // A CSP on a JSON API matters for the error pages and for anything a
        // browser is talked into rendering directly. Nothing is allowed.
        $response->headers->set(
            'Content-Security-Policy',
            "default-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'"
        );

        // HSTS, once and only once the site is genuinely HTTPS-only —
        // advertising it before then locks customers out of a working site.
        if ($request->secure()) {
            $response->headers->set(
                'Strict-Transport-Security',
                'max-age=31536000; includeSubDomains'
            );
        }

        // Laravel announces itself by default; there is no reason to tell an
        // attacker which framework and version to look up.
        $response->headers->remove('X-Powered-By');

        return $response;
    }
}
