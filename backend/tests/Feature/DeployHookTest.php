<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Schema;
use Tests\TestCase;

/** The deploy's migration hook: invisible unless configured and asked correctly. */
class DeployHookTest extends TestCase
{
    use RefreshDatabase;

    private const TOKEN = 'a3f1c9e07b2d4a6f8e1c3b5d7f9a0c2e4b6d8f0a1c3e5b7d';

    public function test_it_does_not_exist_until_a_token_is_configured(): void
    {
        config(['freshness.deploy_token' => null]);

        $this->postJson('/api/deploy/migrate', [], ['X-Deploy-Token' => ''])->assertNotFound();
    }

    public function test_a_short_token_counts_as_none(): void
    {
        config(['freshness.deploy_token' => 'short']);

        $this->postJson('/api/deploy/migrate', [], ['X-Deploy-Token' => 'short'])->assertNotFound();
    }

    public function test_a_wrong_token_looks_like_no_such_route(): void
    {
        config(['freshness.deploy_token' => self::TOKEN]);

        $this->postJson('/api/deploy/migrate', [], ['X-Deploy-Token' => strrev(self::TOKEN)])->assertNotFound();
        $this->postJson('/api/deploy/migrate')->assertNotFound();
    }

    public function test_the_right_token_runs_migrations(): void
    {
        config(['freshness.deploy_token' => self::TOKEN]);

        $this->postJson('/api/deploy/migrate', [], ['X-Deploy-Token' => self::TOKEN])
            ->assertOk()
            ->assertJson(['ok' => true]);

        $this->assertTrue(Schema::hasColumn('users', 'two_factor_secret'));
    }

    public function test_it_is_rate_limited(): void
    {
        config(['freshness.deploy_token' => self::TOKEN]);

        for ($i = 0; $i < 3; $i++) {
            $this->postJson('/api/deploy/migrate', [], ['X-Deploy-Token' => 'nope']);
        }

        $this->postJson('/api/deploy/migrate', [], ['X-Deploy-Token' => self::TOKEN])->assertStatus(429);
    }
}
