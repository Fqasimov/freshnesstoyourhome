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
        // Counted from the seed rather than written here: the catalogue grows
        // whenever the shop adds a listing, and a hard-coded number turns that
        // into a failing test rather than a passing one.
        $seed = json_decode((string) file_get_contents(base_path('../shared/catalogue.json')), true, 512, JSON_THROW_ON_ERROR);

        $this->getJson('/api/catalogue')
            ->assertOk()
            ->assertJsonCount(count($seed['products']), 'products')
            ->assertJsonCount(count($seed['categories']), 'categories');
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
        // The endpoint now carries a bundles key — the admin panel can switch
        // a set on — so the guarantee is that none of them ships switched on,
        // not that the feature is absent.
        $body = $this->getJson('/api/catalogue')->json();

        $this->assertSame([], $body['bundles']);
        $this->assertSame(0, \App\Models\Bundle::where('is_active', true)->count());
    }

    /**
     * A set is only real while everything in it can be bought.
     *
     * Switching a bundle on and then selling out of one of its four products
     * would otherwise leave a promotion on the front page that the order
     * endpoint refuses — and the customer finds out at checkout.
     */
    public function test_a_bundle_disappears_when_one_of_its_products_sells_out(): void
    {
        $bundle = \App\Models\Bundle::with('items')->first();
        $bundle->forceFill(['is_active' => true])->save();

        $this->assertContains(
            $bundle->id,
            collect($this->getJson('/api/catalogue')->json('bundles'))->pluck('id')->all(),
        );

        Product::find($bundle->items->first()->product_id)->update(['in_stock' => false]);

        $this->assertSame([], $this->getJson('/api/catalogue')->json('bundles'));
    }
}
