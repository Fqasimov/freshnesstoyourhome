<?php

namespace App\Providers;

use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Facades\URL;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        //
    }

    public function boot(): void
    {
        $this->enforceProductionSafety();
        $this->defineRateLimiters();
        $this->bustCatalogueCacheOnWrite();
    }

    /**
     * Refuse to run insecurely in production.
     *
     * These are the settings that are fine on a laptop and dangerous on a
     * server, and the ones most likely to be got wrong during a rushed first
     * deploy. Failing loudly at boot beats discovering it from a stack trace
     * in a customer's screenshot.
     */
    private function enforceProductionSafety(): void
    {
        if (! $this->app->environment('production')) {
            return;
        }

        // Generate every URL as https, so a password-reset-style link or an
        // asset reference cannot be emitted as cleartext http.
        URL::forceScheme('https');

        if (config('app.debug')) {
            // Not an exception: taking the whole shop offline over this would
            // be its own outage. Loud, immediate, and impossible to miss in
            // the logs instead.
            Log::critical(
                'APP_DEBUG is true in production. Stack traces, environment '.
                'variables and queries are being exposed to clients. Set '.
                'APP_DEBUG=false immediately.'
            );
        }

        // A query that returns the whole orders table is a bug on a laptop and
        // an outage in production.
        DB::preventLazyLoading();
    }

    /**
     * Named limiters, referenced by routes/api.php.
     *
     * Each one is keyed by what the attacker actually controls. Keying
     * everything on the IP is a common mistake: mobile carriers put thousands
     * of customers behind one address, so an IP-only limit either punishes
     * real customers or is set so loose it stops nobody.
     */
    private function defineRateLimiters(): void
    {
        // Asking for a sign-in code sends mail. The service applies three
        // finer-grained budgets on top of this; this is the coarse gate that
        // keeps a flood from reaching the mailer at all.
        RateLimiter::for('otp-request', fn (Request $r) => [
            Limit::perMinute(3)->by($r->ip()),
            Limit::perHour(20)->by($r->ip()),
        ]);

        // Guessing a code. Keyed on the email being guessed as well as the
        // source, so an attacker cannot spread attempts against one victim
        // across many addresses of their own.
        RateLimiter::for('otp-verify', fn (Request $r) => [
            Limit::perMinute(6)->by($r->ip()),
            Limit::perMinute(6)->by('email:'.sha1((string) $r->input('email'))),
        ]);

        // Placing an order is cheap for the customer and expensive for the
        // shop: every one is goods set aside and a courier slot.
        RateLimiter::for('place-order', fn (Request $r) => [
            Limit::perMinute(5)->by($r->user()?->id ?: $r->ip()),
            Limit::perDay(40)->by($r->user()?->id ?: $r->ip()),
        ]);

        // Public and cached, so it can be generous — but not unbounded, or it
        // is a free way to make the server do work.
        RateLimiter::for('catalogue', fn (Request $r) => Limit::perMinute(60)->by($r->ip()));

        // Laravel's default for everything else.
        RateLimiter::for('api', fn (Request $r) => Limit::perMinute(60)->by($r->user()?->id ?: $r->ip()));
    }

    /**
     * Keep the cached catalogue honest.
     *
     * A shopkeeper changing a price expects to see it in the app, not in ten
     * minutes. Anything that writes to the catalogue tables clears the cache,
     * so the TTL is only a backstop rather than the mechanism.
     */
    private function bustCatalogueCacheOnWrite(): void
    {
        $models = [
            \App\Models\Product::class,
            \App\Models\ProductTranslation::class,
            \App\Models\Category::class,
            \App\Models\CategoryTranslation::class,
            \App\Models\DeliveryZone::class,
            \App\Models\DeliveryZoneTranslation::class,
        ];

        foreach ($models as $model) {
            $model::saved(fn () => Cache::forget('catalogue:v1'));
            $model::deleted(fn () => Cache::forget('catalogue:v1'));
        }
    }
}
