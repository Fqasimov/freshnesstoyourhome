<?php

namespace Tests\Feature;

use App\Models\Address;
use App\Models\AdminAudit;
use App\Models\Bundle;
use App\Models\DeliveryZone;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Product;
use App\Models\ProductImage;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

/**
 * More than one photograph per product, and deleting things for good.
 */
class AdminDeleteGalleryTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seedCatalogue();
        Storage::fake('public');

        $admin = User::factory()->create();
        $admin->promote(User::ROLE_ADMIN);
        $this->signInAs($admin->fresh());
    }

    private function photo(): UploadedFile
    {
        return UploadedFile::fake()->image('extra.jpg', 1200, 900);
    }

    public function test_extra_photos_are_added_listed_in_the_catalogue_and_removed(): void
    {
        $first = $this->post('/api/admin/products/smoked-salmon/gallery', ['photo' => $this->photo()], ['Accept' => 'application/json'])
            ->assertCreated()->json('gallery');
        $this->assertCount(1, $first);

        $this->post('/api/admin/products/smoked-salmon/gallery', ['photo' => $this->photo()], ['Accept' => 'application/json'])->assertCreated();

        \App\Support\CatalogueCache::flush();
        $product = collect($this->getJson('/api/catalogue')->json('products'))->firstWhere('id', 'smoked-salmon');
        $this->assertCount(2, $product['gallery']);
        $this->assertArrayHasKey('thumb_url', $product['gallery'][0]);

        $file = ProductImage::first()->file;
        Storage::disk('public')->assertExists($file);

        $this->deleteJson('/api/admin/products/smoked-salmon/gallery/'.$first[0]['id'])->assertOk()->assertJsonCount(1, 'gallery');
        Storage::disk('public')->assertMissing($file);
    }

    public function test_the_gallery_has_a_ceiling(): void
    {
        for ($i = 0; $i < 8; $i++) {
            $this->post('/api/admin/products/smoked-salmon/gallery', ['photo' => $this->photo()], ['Accept' => 'application/json'])->assertCreated();
        }
        $this->post('/api/admin/products/smoked-salmon/gallery', ['photo' => $this->photo()], ['Accept' => 'application/json'])
            ->assertStatus(422)->assertJsonValidationErrors(['photo']);
    }

    public function test_deleting_a_product_removes_it_its_photos_and_its_place_in_sets_but_not_old_orders(): void
    {
        $this->post('/api/admin/products/smoked-salmon/gallery', ['photo' => $this->photo()], ['Accept' => 'application/json'])->assertCreated();
        $file = ProductImage::first()->file;

        $bundle = Bundle::first();
        $inBundle = $bundle->items()->pluck('product_id')->all();
        $target = $inBundle[0] ?? null;
        $this->assertNotNull($target, 'the seeded set holds products');

        $this->deleteJson("/api/admin/products/{$target}")->assertOk();

        $this->assertDatabaseMissing('products', ['id' => $target]);
        $this->assertFalse($bundle->items()->where('product_id', $target)->exists());

        $this->deleteJson('/api/admin/products/smoked-salmon')->assertOk();
        Storage::disk('public')->assertMissing($file);
        $this->assertSame(0, ProductImage::count());
        $this->assertTrue(AdminAudit::where('action', 'product.delete')->where('subject_id', 'smoked-salmon')->exists());
        $this->deleteJson('/api/admin/products/smoked-salmon')->assertNotFound();
    }

    public function test_a_set_left_with_no_products_is_switched_off(): void
    {
        $bundle = Bundle::first();
        foreach ($bundle->items()->pluck('product_id') as $id) {
            $this->deleteJson("/api/admin/products/{$id}")->assertOk();
        }
        $this->assertFalse((bool) $bundle->fresh()->is_active);
    }

    public function test_a_set_can_be_deleted_without_touching_its_products(): void
    {
        $bundle = Bundle::first();
        $ids = $bundle->items()->pluck('product_id')->all();

        $this->deleteJson("/api/admin/bundles/{$bundle->id}")->assertOk();

        $this->assertDatabaseMissing('bundles', ['id' => $bundle->id]);
        $this->assertSame(count($ids), Product::whereIn('id', $ids)->count());
    }

    public function test_an_order_keeps_its_lines_when_the_product_is_deleted(): void
    {
        [$user, $address] = $this->customerWithAddress(['name' => 'Nicat', 'phone' => '+994501112233']);
        $this->signInAs($user);
        $order = $this->postJson('/api/orders', $this->orderPayload($address, ['smoked-salmon' => 1]))->assertCreated()->json();

        $admin = User::factory()->create();
        $admin->promote(User::ROLE_ADMIN);
        $this->signInAs($admin->fresh());
        $this->deleteJson('/api/admin/products/smoked-salmon')->assertOk();

        $item = OrderItem::where('order_id', $order['id'])->first();
        $this->assertNull($item->product_id);
        $this->assertNotEmpty($item->name_snapshot['az']);
    }

    public function test_a_zone_with_saved_addresses_cannot_be_deleted_but_an_unused_one_can(): void
    {
        [$user, $address] = $this->customerWithAddress(['name' => 'Nicat', 'phone' => '+994501112233']);
        $used = $address->delivery_zone_id;
        $this->assertNotNull($used);

        $this->deleteJson("/api/admin/zones/{$used}")->assertStatus(422);
        $this->assertDatabaseHas('delivery_zones', ['id' => $used]);

        $spare = DeliveryZone::where('id', '!=', $used)->first();
        $this->assertSame(0, Address::where('delivery_zone_id', $spare->id)->count());
        $this->deleteJson("/api/admin/zones/{$spare->id}")->assertOk();
        $this->assertDatabaseMissing('delivery_zones', ['id' => $spare->id]);
    }
}
