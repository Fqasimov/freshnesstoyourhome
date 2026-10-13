<?php

namespace Tests\Feature;

use App\Models\Bundle;
use App\Models\Product;
use App\Models\User;
use App\Support\CatalogueCache;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;
use Tests\TestCase;

/**
 * Sales on products and sets: a percentage with decimals or an amount off,
 * and which of the two the website shows. The catalogue, the quote and the
 * order must all come to the same figure.
 */
class DiscountTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seedCatalogue();
    }

    private function asAdmin(): void
    {
        $this->signInAs(User::factory()->admin()->create()->fresh());
    }

    private function catalogueProduct(string $id): array
    {
        Cache::forget(CatalogueCache::KEY);

        return collect($this->getJson('/api/catalogue')->assertOk()->json('products'))->firstWhere('id', $id);
    }

    private function catalogueBundle(string $id): ?array
    {
        Cache::forget(CatalogueCache::KEY);

        return collect($this->getJson('/api/catalogue')->assertOk()->json('bundles'))->firstWhere('id', $id);
    }

    public function test_a_product_takes_a_percentage_with_decimals(): void
    {
        $this->asAdmin();

        // smoked-dorado is 15.00; 16.4% off is 2.46, so 12.54.
        $this->patchJson('/api/admin/products/smoked-dorado', [
            'discount_kind' => 'percent', 'discount_percent' => 16.4, 'discount_show' => 'percent',
        ])->assertOk()->assertJsonPath('sale_price_minor', 1254);

        $p = $this->catalogueProduct('smoked-dorado');
        $this->assertSame(1254, $p['price_minor']);
        $this->assertSame(1500, $p['regular_price_minor']);
        $this->assertSame(['show' => 'percent', 'percent' => 16.4, 'amount_minor' => 246], $p['discount']);

        $this->postJson('/api/orders/quote', ['lines' => [['product_id' => 'smoked-dorado', 'qty' => 2]]])
            ->assertOk()->assertJsonPath('subtotal_minor', 2508)->assertJsonPath('lines.0.unit_price_minor', 1254);
    }

    public function test_a_product_takes_an_amount_off_and_can_show_it(): void
    {
        $this->asAdmin();

        $this->patchJson('/api/admin/products/smoked-trout', [
            'discount_kind' => 'amount', 'discount_minor' => 150, 'discount_show' => 'amount',
        ])->assertOk();

        $p = $this->catalogueProduct('smoked-trout');
        $this->assertSame(750, $p['price_minor']);
        $this->assertSame('amount', $p['discount']['show']);
        $this->assertSame(150, $p['discount']['amount_minor']);
        // Shown as a percentage instead, it is what the amount comes to.
        $this->assertSame(16.6, $p['discount']['percent']);
    }

    public function test_a_discount_must_take_something_off_and_leave_something_to_pay(): void
    {
        $this->asAdmin();

        $this->patchJson('/api/admin/products/smoked-trout', ['discount_kind' => 'percent', 'discount_percent' => 16.456])
            ->assertStatus(422);
        $this->patchJson('/api/admin/products/smoked-trout', ['discount_kind' => 'percent', 'discount_percent' => 95])
            ->assertStatus(422);
        $this->patchJson('/api/admin/products/smoked-trout', ['discount_kind' => 'amount', 'discount_minor' => 900])
            ->assertStatus(422);
        $this->patchJson('/api/admin/products/smoked-trout', ['discount_kind' => 'percent', 'discount_percent' => 0])
            ->assertStatus(422);

        $this->assertSame(900, Product::find('smoked-trout')->salePriceMinor());
    }

    public function test_removing_a_discount_restores_the_price(): void
    {
        $this->asAdmin();

        $this->patchJson('/api/admin/products/smoked-trout', ['discount_kind' => 'percent', 'discount_percent' => 10])->assertOk();
        $this->patchJson('/api/admin/products/smoked-trout', ['discount_kind' => null])->assertOk();

        $p = $this->catalogueProduct('smoked-trout');
        $this->assertSame(900, $p['price_minor']);
        $this->assertNull($p['discount']);
    }

    public function test_the_discount_comes_from_the_panel_not_the_request(): void
    {
        [$user, $address] = $this->customerWithAddress();
        $this->signInAs($user);

        $payload = $this->orderPayload($address, ['smoked-trout' => 1]);
        $payload['lines'][0]['discount_percent'] = 90;

        $this->postJson('/api/orders', $payload)->assertCreated();

        $this->assertSame(900, \App\Models\Order::firstOrFail()->subtotal_minor);
    }

    private function makeSet(array $discount): void
    {
        $this->asAdmin();

        $this->postJson('/api/admin/bundles', [
            'id' => 'duo',
            ...$discount,
            'is_active' => true,
            'items' => [
                ['product_id' => 'smoked-dorado', 'qty' => 1],   // 15.00
                ['product_id' => 'smoked-trout', 'qty' => 2],    // 2 × 9.00
            ],
            'translations' => ['az' => ['name' => 'Duo']],
        ])->assertCreated();
    }

    public function test_a_set_takes_a_percentage_with_decimals(): void
    {
        $this->makeSet(['discount_kind' => 'percent', 'discount_percent' => 12.5]);

        // 15.00 → 13.13 (13.125 rounded), 9.00 → 7.88 (7.875 rounded): 13.13 + 2 × 7.88.
        $b = $this->catalogueBundle('duo');
        $this->assertSame(3300, $b['full_minor']);
        $this->assertSame(1313 + 2 * 788, $b['price_minor']);
        $this->assertSame(12.5, $b['discount']['percent']);

        $this->postJson('/api/orders/quote', ['bundles' => [['id' => 'duo', 'qty' => 1]]])
            ->assertOk()->assertJsonPath('subtotal_minor', $b['price_minor']);
    }

    public function test_a_set_takes_an_amount_off_and_the_order_matches_the_page(): void
    {
        $this->makeSet(['discount_kind' => 'amount', 'discount_minor' => 500, 'discount_show' => 'amount']);

        $b = $this->catalogueBundle('duo');
        $this->assertSame(3300, $b['full_minor']);
        // Shared across the units in proportion to price, each rounded to the
        // qəpik: within a qəpik or two of exactly five manats off.
        $this->assertEqualsWithDelta(2800, $b['price_minor'], 2);
        $this->assertSame('amount', $b['discount']['show']);

        $this->postJson('/api/orders/quote', ['bundles' => [['id' => 'duo', 'qty' => 1]]])
            ->assertOk()->assertJsonPath('subtotal_minor', $b['price_minor']);
    }

    public function test_a_set_is_built_from_its_products_sale_prices(): void
    {
        $this->makeSet(['discount_kind' => 'percent', 'discount_percent' => 10]);
        $this->patchJson('/api/admin/products/smoked-trout', ['discount_kind' => 'amount', 'discount_minor' => 100])->assertOk();

        // Trout is 8.00 on its own now, so the set is 15.00 + 2 × 8.00 before its 10%.
        $this->assertSame(3100, $this->catalogueBundle('duo')['full_minor']);
    }

    public function test_an_amount_off_a_set_is_capped_like_a_percentage(): void
    {
        $this->makeSet(['discount_kind' => 'percent', 'discount_percent' => 10]);

        // 60% of 33.00 is 19.80.
        $this->patchJson('/api/admin/bundles/duo', ['discount_kind' => 'amount', 'discount_minor' => 1990])->assertStatus(422);
        $this->patchJson('/api/admin/bundles/duo', ['discount_kind' => 'amount', 'discount_minor' => 1980])->assertOk();
        $this->patchJson('/api/admin/bundles/duo', ['discount_kind' => 'percent', 'discount_percent' => 60.01])->assertStatus(422);

        $this->assertSame('amount', Bundle::find('duo')->discount_kind);
    }
}
