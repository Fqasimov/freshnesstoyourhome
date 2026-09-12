<?php

namespace Tests\Feature;

use App\Models\Product;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;
use Tests\TestCase;

class CatalogueEndpointTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seedCatalogue();
        Cache::clear();
    }

    public function test_the_catalogue_is_public(): void
    {
        $this->getJson('/api/catalogue')
            ->assertOk()
            ->assertJsonCount(54, 'products')
            ->assertJsonCount(6, 'categories');
    }

    /**
     * The cached response must be the same shape as the uncached one.
     *
     * This is the test that matters, and a single-request test would never
     * have found the bug it exists for: the first call is a cache miss and
     * serialises nothing, so it always looked right. From the second call
     * onwards the endpoint was returning an unserialisable Collection as
     * {"__PHP_Incomplete_Class_Name": "Illuminate\\Support\\Collection"} and
     * the app rendered an empty shop.
     */
    public function test_the_second_request_returns_the_same_shape_as_the_first(): void
    {
        $first = $this->getJson('/api/catalogue')->assertOk()->json();
        $second = $this->getJson('/api/catalogue')->assertOk()->json();

        $this->assertSame($first, $second);

        foreach (['categories', 'products', 'zones'] as $key) {
            $this->assertIsList($second[$key], "{$key} came back as something other than a list");
        }
    }

    public function test_every_product_carries_all_three_languages(): void
    {
        $products = $this->getJson('/api/catalogue')->json('products');

        foreach ($products as $p) {
            foreach (['az', 'ru', 'en'] as $locale) {
                $this->assertNotEmpty($p['name'][$locale] ?? null, "{$p['id']} has no {$locale} name");
            }
        }
    }

    public function test_goods_sold_by_the_kilo_are_flagged_for_the_client(): void
    {
        $products = collect($this->getJson('/api/catalogue')->json('products'));

        $weighed = $products->where('is_weight_based', true);

        $this->assertGreaterThan(0, $weighed->count());
        $this->assertTrue($weighed->every(fn ($p) => $p['unit_kind'] === 'kg'));
    }

    public function test_an_inactive_product_disappears_from_the_catalogue(): void
    {
        Product::find('smoked-salmon')->update(['is_active' => false]);

        $ids = collect($this->getJson('/api/catalogue')->json('products'))->pluck('id');

        $this->assertNotContains('smoked-salmon', $ids);
    }

    /** A price edit must reach customers immediately, not after the TTL. */
    public function test_a_price_change_busts_the_cache(): void
    {
        $this->getJson('/api/catalogue')->assertOk();

        Product::find('smoked-salmon')->update(['price_minor' => 7_100]);

        $price = collect($this->getJson('/api/catalogue')->json('products'))
            ->firstWhere('id', 'smoked-salmon')['price_minor'];

        $this->assertSame(7100, $price);
    }

    public function test_the_bundles_invented_during_design_are_not_offered(): void
    {
        // Their contents and discounts have never been confirmed by the
        // business. In an app an unconfirmed discount is a real transaction.
        $body = $this->getJson('/api/catalogue')->json();

        $this->assertArrayNotHasKey('bundles', $body);
        $this->assertSame(0, \App\Models\Bundle::where('is_active', true)->count());
    }
}
