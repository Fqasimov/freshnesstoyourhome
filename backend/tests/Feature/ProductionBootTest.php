<?php

namespace Tests\Feature;

use App\Providers\AppServiceProvider;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * The app has to boot in production.
 *
 * Every other test runs with APP_ENV=testing, which skips the production-only
 * hardening in AppServiceProvider entirely — and that branch once called a
 * method that does not exist (DB::preventLazyLoading), so the first request
 * on a real server would have died while every test stayed green. This runs
 * that branch on purpose.
 */
class ProductionBootTest extends TestCase
{
    use RefreshDatabase;

    public function test_the_production_branch_of_the_service_provider_runs(): void
    {
        $this->app['env'] = 'production';
        config(['app.debug' => false]);

        (new AppServiceProvider($this->app))->boot();

        $this->assertTrue($this->app->isProduction());
    }

    public function test_the_catalogue_is_served_in_production(): void
    {
        $this->seedCatalogue();
        $this->app['env'] = 'production';
        (new AppServiceProvider($this->app))->boot();

        $this->getJson('/api/catalogue')->assertOk();
    }
}
