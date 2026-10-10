<?php

namespace Tests\Feature;

use App\Models\Bundle;
use App\Models\Category;
use App\Models\OrderItem;
use App\Models\Product;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Reordering shelves and products, and changing a product's unit and code.
 */
class AdminOrderingTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seedCatalogue();

        $admin = User::factory()->create();
        $admin->promote(User::ROLE_ADMIN);
        $this->signInAs($admin->fresh());
    }

    public function test_categories_are_reordered_and_the_catalogue_follows(): void
    {
        $ids = Category::orderBy('sort')->pluck('id')->all();
        $flipped = array_reverse($ids);

        $this->postJson('/api/admin/categories/order', ['ids' => $flipped])->assertOk();

        $this->assertSame($flipped, Category::orderBy('sort')->pluck('id')->all());
        $this->assertSame(range(1, count($ids)), Category::orderBy('sort')->pluck('sort')->all());
    }

    public function test_products_are_reordered_within_their_category(): void
    {
        $category = Product::first()->category_id;
        $ids = Product::where('category_id', $category)->orderBy('sort')->pluck('id')->all();
        $this->assertGreaterThan(1, count($ids));
        $flipped = array_reverse($ids);

        $this->postJson('/api/admin/products/order', ['category_id' => $category, 'ids' => $flipped])->assertOk();

        $this->assertSame($flipped, Product::where('category_id', $category)->orderBy('sort')->pluck('id')->all());
    }

    public function test_the_unit_of_a_product_can_be_changed(): void
    {
        $this->patchJson('/api/admin/products/smoked-salmon', ['unit_kind' => 'pc', 'unit_qty' => 2])
            ->assertOk()->assertJsonPath('unit_kind', 'pc')->assertJsonPath('is_weight_based', false);

        $this->assertSame('pc', Product::find('smoked-salmon')->unit_kind);
        $this->patchJson('/api/admin/products/smoked-salmon', ['unit_kind' => 'liter'])->assertUnprocessable();
    }

    public function test_a_product_code_can_be_changed_and_everything_follows_it(): void
    {
        $bundle = Bundle::create(['id' => 'duo', 'discount_percent' => 10, 'is_active' => false, 'sort' => 1]);
        $bundle->items()->create(['product_id' => 'smoked-salmon', 'qty' => 1]);

        [$user, $address] = $this->customerWithAddress(['name' => 'Nicat', 'phone' => '+994501112233']);
        $this->signInAs($user);
        $order = $this->postJson('/api/orders', $this->orderPayload($address, ['smoked-salmon' => 1]))->assertCreated()->json();

        $admin = User::factory()->create();
        $admin->promote(User::ROLE_ADMIN);
        $this->signInAs($admin->fresh());

        $this->patchJson('/api/admin/products/smoked-salmon', ['new_id' => 'salmon-new'])
            ->assertOk()->assertJsonPath('id', 'salmon-new');

        $this->assertNull(Product::find('smoked-salmon'));
        $moved = Product::with('translations')->find('salmon-new');
        $this->assertNotNull($moved);
        $this->assertGreaterThan(0, $moved->translations->count());
        $this->assertSame('salmon-new', $bundle->items()->first()->product_id);
        $this->assertSame('salmon-new', OrderItem::where('order_id', $order['id'])->first()->product_id);
    }

    public function test_a_product_code_must_be_a_free_slug(): void
    {
        $this->patchJson('/api/admin/products/smoked-salmon', ['new_id' => 'Bad Code'])->assertUnprocessable();
        $other = Product::where('id', '!=', 'smoked-salmon')->value('id');
        $this->patchJson('/api/admin/products/smoked-salmon', ['new_id' => $other])->assertUnprocessable();
    }

    public function test_a_set_is_quoted_and_ordered_at_its_discount(): void
    {
        $bundle = Bundle::create(['id' => 'duo', 'discount_percent' => 10, 'is_active' => true, 'sort' => 1]);
        $bundle->items()->create(['product_id' => 'smoked-mackerel', 'qty' => 2]);
        $bundle->items()->create(['product_id' => 'smoked-dorado', 'qty' => 1]);

        $expected = 0;
        foreach ($bundle->items()->get() as $item) {
            $unit = \App\Services\PricingService::bundleUnitMinor(Product::find($item->product_id)->price_minor, 10);
            $expected += (int) round($unit * (float) $item->qty);
        }
        $full = (int) $bundle->items()->get()->sum(fn ($i) => Product::find($i->product_id)->price_minor * $i->qty);
        $this->assertLessThan($full, $expected);

        $zone = self::ZONE;

        $quote = $this->postJson('/api/orders/quote', ['bundles' => [['id' => 'duo', 'qty' => 1]], 'zone_id' => $zone])
            ->assertOk()->json();
        $this->assertSame($expected, $quote['subtotal_minor']);

        $order = $this->postJson('/api/orders/web', [
            'bundles' => [['id' => 'duo', 'qty' => 1]],
            'zone_id' => $zone,
            'contact_first_name' => 'Nicat', 'contact_last_name' => 'Aliyev',
            'contact_phone' => '+994501112233',
        ])->assertCreated()->json();

        $this->assertSame($quote['total_minor'], $order['total_minor']);
        $this->assertSame($expected, (int) \App\Models\Order::find($order['id'])->subtotal_minor);
    }

    public function test_a_switched_off_set_cannot_be_ordered(): void
    {
        $bundle = Bundle::create(['id' => 'duo', 'discount_percent' => 10, 'is_active' => false, 'sort' => 1]);
        $bundle->items()->create(['product_id' => 'smoked-mackerel', 'qty' => 1]);

        $this->postJson('/api/orders/web', [
            'bundles' => [['id' => 'duo', 'qty' => 1]],
            'zone_id' => self::ZONE,
            'contact_first_name' => 'Nicat', 'contact_last_name' => 'Aliyev',
            'contact_phone' => '+994501112233',
        ])->assertStatus(422);
    }
}
