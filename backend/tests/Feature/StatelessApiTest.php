<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * The API never asks for a CSRF token.
 *
 * Every client authenticates with a bearer token, so Sanctum's stateful
 * (cookie + CSRF) mode must stay off even when the request comes from a page
 * on the API's own host — which is exactly the deployed layout: the shop at
 * DOMAIN, the API at DOMAIN/server. bootstrap/app.php once turned that mode on
 * by accident, and the admin panel's sign-in failed with a 419.
 */
class StatelessApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_a_request_from_the_apis_own_host_is_not_asked_for_a_csrf_token(): void
    {
        // Treat the shop's host as a first-party SPA host, as Sanctum does by
        // default for the host in APP_URL.
        config(['sanctum.stateful' => ['freshnesstoyourhome.az']]);

        // Laravel skips CSRF checks entirely while the environment is
        // "testing", which would make this pass whether or not the bug is
        // there. Look like a real server for this one request.
        $this->app['env'] = 'local';

        $this->withHeaders([
            'Origin' => 'https://freshnesstoyourhome.az',
            'Referer' => 'https://freshnesstoyourhome.az/cms/',
        ])->postJson('/api/auth/request-code', ['email' => 'someone@example.com'])
            ->assertOk();
    }
}
