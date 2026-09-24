<?php

use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Request;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        $middleware->alias([
            'role' => \App\Http\Middleware\EnsureRole::class,
            'blocked' => \App\Http\Middleware\EnsureNotBlocked::class,
        ]);

        // Applied to every response, including error responses.
        $middleware->append(\App\Http\Middleware\SecurityHeaders::class);

        // The API is stateless and token-authenticated. There is no session
        // cookie, so there is no CSRF surface — and no cookie for a malicious
        // site to ride. Sanctum's stateful domain support is deliberately not
        // enabled: the mobile app and the website both use bearer tokens.
        //
        // Not enabled means not calling statefulApi() at all. This line used
        // to read statefulApi(false), but the method takes no argument — the
        // false was ignored and it switched stateful mode ON. That stayed
        // invisible while the website and the API lived on different hosts;
        // served from the same host (the shop at DOMAIN, the API at
        // DOMAIN/server), every POST from the admin panel died with a 419
        // CSRF token mismatch. StatelessApiTest holds this.

        // Behind a load balancer or CDN the client IP arrives in a header.
        // Without this, every rate limit counts the proxy as one client and
        // the whole system shares one budget.
        $middleware->trustProxies(at: env('TRUSTED_PROXIES', '*'));
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        $exceptions->shouldRenderJsonWhen(
            fn (Request $request) => $request->is('api/*') || $request->expectsJson(),
        );

        // Never let a stack trace, a file path or a query reach a client.
        // APP_DEBUG=false covers this in production; this is the belt to that
        // pair of braces, for the day somebody deploys with it set wrong.
        $exceptions->respond(function ($response, \Throwable $e, Request $request) {
            if (! $request->is('api/*')) {
                return $response;
            }

            if ($response->getStatusCode() === 500 && ! config('app.debug')) {
                return response()->json(['message' => 'Something went wrong.'], 500);
            }

            return $response;
        });
    })->create();
