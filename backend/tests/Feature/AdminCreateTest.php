<?php

namespace Tests\Feature;

use App\Models\AdminAudit;
use App\Models\Bundle;
use App\Models\DeliveryZone;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Making new sets and delivery areas from the panel, and editing a product's
 * words as well as its numbers.
 */
class AdminCreateTest extends TestCase
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

    public function test_a_new_set_is_created_switched_off_and_audited(): void
    {
        $this->postJson('/api/admin/bundles', [
            'id' => 'fish-friday',
            'discount_percent' => 10,
            'items' => [
                ['product_id' => 'smoked-salmon', 'qty' => 1],
                ['product_id' => 'fresh-dorado', 'qty' => 2],
            ],
            'translations' => [
                'az' => ['name' => 'Balıq cüməsi', 'description' => 'Hisə verilmiş və təzə balıq'],
                'en' => ['name' => 'Fish Friday'],
            ],
        ])->assertCreated()
            ->assertJsonPath('id', 'fish-friday')
            ->assertJsonPath('is_active', false)
            ->assertJsonPath('name.az', 'Balıq cüməsi')
            ->assertJsonPath('description.az', 'Hisə verilmiş və təzə balıq')
            ->assertJsonCount(2, 'items');

        $this->assertTrue(AdminAudit::where('action', 'bundle.create')->where('subject_id', 'fish-friday')->exists());
    }

    public function test_a_set_needs_real_products_an_az_name_and_a_sane_discount(): void
    {
        $this->postJson('/api/admin/bundles', [
            'id' => 'bad set',
            'discount_percent' => 90,
            'items' => [['product_id' => 'no-such-thing', 'qty' => 1]],
            'translations' => ['en' => ['name' => 'X']],
        ])->assertStatus(422)->assertJsonValidationErrors([
            'id', 'discount_percent', 'items.0.product_id', 'translations.az.name',
        ]);

        $this->assertSame(0, Bundle::where('id', 'bad set')->count());
    }

    public function test_a_new_delivery_zone_is_created_and_quoted_at_once(): void
    {
        $this->postJson('/api/admin/zones', [
            'id' => 'test-qesebe',
            'fee_minor' => 900,
            'min_order_minor' => 3000,
            'translations' => ['az' => ['name' => 'Test qəsəbəsi'], 'ru' => ['name' => 'Тест посёлок']],
        ])->assertCreated()
            ->assertJsonPath('id', 'test-qesebe')
            ->assertJsonPath('name.az', 'Test qəsəbəsi');

        $zone = DeliveryZone::findOrFail('test-qesebe');
        $this->assertTrue($zone->is_active);

        // Customers see it straight away, and are charged its fee.
        $this->getJson('/api/catalogue')->assertOk()
            ->assertJsonFragment(['id' => 'test-qesebe', 'fee_minor' => 900]);

        $this->assertTrue(AdminAudit::where('action', 'zone.create')->exists());
    }

    public function test_a_zone_id_is_unique_and_a_slug(): void
    {
        $this->postJson('/api/admin/zones', [
            'id' => self::ZONE, 'fee_minor' => 500, 'translations' => ['az' => ['name' => 'X']],
        ])->assertStatus(422)->assertJsonValidationErrors('id');

        $this->postJson('/api/admin/zones', [
            'id' => 'Has Spaces', 'fee_minor' => 500, 'translations' => ['az' => ['name' => 'X']],
        ])->assertStatus(422)->assertJsonValidationErrors('id');
    }

    public function test_a_zone_can_be_renamed(): void
    {
        $this->patchJson('/api/admin/zones/'.self::ZONE, ['translations' => ['az' => ['name' => 'Şəhər mərkəzi']]])
            ->assertOk()
            ->assertJsonPath('name.az', 'Şəhər mərkəzi');
    }

    public function test_a_products_name_description_and_unit_label_can_be_edited(): void
    {
        $this->patchJson('/api/admin/products/smoked-salmon', [
            'translations' => [
                'az' => ['name' => 'Hisə verilmiş qızılbalıq', 'description' => 'Norveç, soyuq hisə', 'unit_label' => '1 kq'],
                'en' => ['description' => 'Norwegian, cold smoked'],
            ],
        ])->assertOk()
            ->assertJsonPath('name.az', 'Hisə verilmiş qızılbalıq')
            ->assertJsonPath('description.az', 'Norveç, soyuq hisə')
            ->assertJsonPath('description.en', 'Norwegian, cold smoked');
    }

    public function test_a_new_product_keeps_its_description(): void
    {
        $this->postJson('/api/admin/products', [
            'id' => 'kefir-1l',
            'category_id' => 'cheese',
            'price_minor' => 350,
            'unit_kind' => 'pc',
            'translations' => ['az' => ['name' => 'Kefir 1 l', 'description' => 'Kənd kefiri']],
        ])->assertCreated()->assertJsonPath('description.az', 'Kənd kefiri');
    }

    public function test_a_customer_cannot_create_sets_or_zones(): void
    {
        $this->signInAs(User::factory()->create());

        $this->postJson('/api/admin/bundles', [])->assertNotFound();
        $this->postJson('/api/admin/zones', [])->assertNotFound();
    }

    public function test_a_new_category_is_created_and_stays_off_the_shelf_until_it_has_products(): void
    {
        $this->postJson('/api/admin/categories', [
            'id' => 'test-salads',
            'translations' => ['az' => ['name' => 'Salatlar'], 'en' => ['name' => 'Salads'], 'ru' => ['name' => '']],
        ])->assertCreated()->assertJsonPath('name.az', 'Salatlar')->assertJsonPath('product_count', 0);

        $this->assertTrue(AdminAudit::where('action', 'category.create')->exists());

        $ids = fn () => collect($this->getJson('/api/catalogue')->json('categories'))->pluck('id');
        $this->assertFalse($ids()->contains('test-salads'));

        $this->postJson('/api/admin/products', [
            'id' => 'test-greek-salad', 'category_id' => 'test-salads', 'price_minor' => 900,
            'unit_kind' => 'pc', 'unit_qty' => 1,
            'translations' => ['az' => ['name' => 'Yunan salatı', 'unit_label' => '1 ədəd']],
        ])->assertCreated();

        \App\Support\CatalogueCache::flush();
        $this->assertTrue($ids()->contains('test-salads'));
    }

    public function test_a_category_needs_an_azerbaijani_name_and_a_fresh_code(): void
    {
        $this->postJson('/api/admin/categories', ['id' => 'Bad Code', 'translations' => ['az' => ['name' => '']]])
            ->assertStatus(422)->assertJsonValidationErrors(['id', 'translations.az.name']);

        $existing = \App\Models\Category::first()->id;
        $this->postJson('/api/admin/categories', ['id' => $existing, 'translations' => ['az' => ['name' => 'X']]])
            ->assertStatus(422)->assertJsonValidationErrors(['id']);
    }

    public function test_only_an_empty_category_can_be_deleted(): void
    {
        $used = \App\Models\Product::first()->category_id;
        $this->deleteJson("/api/admin/categories/{$used}")->assertStatus(422);
        $this->assertDatabaseHas('categories', ['id' => $used]);

        $this->postJson('/api/admin/categories', ['id' => 'test-empty', 'translations' => ['az' => ['name' => 'Boş']]])->assertCreated();
        $this->deleteJson('/api/admin/categories/test-empty')->assertOk();
        $this->assertDatabaseMissing('categories', ['id' => 'test-empty']);
    }
}
