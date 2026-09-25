<?php

namespace Tests\Feature;

use App\Models\Product;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/**
 * Adding a product from the panel.
 *
 * The id is the part worth guarding. It is written into every order line that
 * ever contains this product, and it is the key the website and the app use to
 * find a picture in their own bundles — so it has to be a slug, it has to be
 * unique, and it can never change afterwards.
 */
class ProductCreationTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seedCatalogue();
        Storage::fake('public');
    }

    private function admin(): User
    {
        $user = User::factory()->create();
        $user->promote(User::ROLE_ADMIN);

        return $user->fresh();
    }

    private function payload(array $override = []): array
    {
        return array_replace_recursive([
            'id' => 'kefir-1l',
            'category_id' => 'cheese',
            'price_minor' => 450,
            'unit_kind' => 'pc',
            'unit_qty' => 1,
            'translations' => [
                'az' => ['name' => 'Kefir 1 l', 'unit_label' => '1 l'],
                'en' => ['name' => 'Kefir 1 l', 'unit_label' => '1 l'],
                'ru' => ['name' => 'Кефир 1 л', 'unit_label' => '1 л'],
            ],
        ], $override);
    }

    public function test_it_creates_a_product_and_puts_it_on_sale(): void
    {
        $this->signInAs($this->admin());

        $this->postJson('/api/admin/products', $this->payload())
            ->assertCreated()
            ->assertJsonPath('id', 'kefir-1l')
            ->assertJsonPath('price_minor', 450)
            ->assertJsonPath('name.ru', 'Кефир 1 л');

        $ids = collect($this->getJson('/api/catalogue')->json('products'))->pluck('id');
        $this->assertContains('kefir-1l', $ids);
    }

    public function test_the_id_has_to_be_a_slug(): void
    {
        $this->signInAs($this->admin());

        $before = Product::count();

        foreach (['Kefir 1L', 'kefir_1l', '../etc/passwd', 'kefir--1l', '-kefir', 'ke', 'KEFIR'] as $bad) {
            $this->postJson('/api/admin/products', $this->payload(['id' => $bad]))
                ->assertStatus(422);
        }

        $this->assertSame($before, Product::count());
    }

    public function test_it_refuses_an_id_that_is_already_taken(): void
    {
        $this->signInAs($this->admin());

        $this->postJson('/api/admin/products', $this->payload(['id' => 'smoked-salmon']))
            ->assertStatus(422);
    }

    public function test_a_product_needs_a_name_in_azerbaijani(): void
    {
        $this->signInAs($this->admin());

        $body = $this->payload();
        unset($body['translations']['az']);

        $this->postJson('/api/admin/products', $body)->assertStatus(422);
    }

    public function test_it_refuses_a_category_that_does_not_exist(): void
    {
        $this->signInAs($this->admin());

        $this->postJson('/api/admin/products', $this->payload(['category_id' => 'sweets']))
            ->assertStatus(422);
    }

    /** A new product has no picture in anybody's bundle, so it needs the upload. */
    public function test_a_new_product_carries_no_bundled_picture_and_can_be_photographed(): void
    {
        $this->signInAs($this->admin());

        $this->postJson('/api/admin/products', $this->payload())
            ->assertCreated()
            ->assertJsonPath('image', null)
            ->assertJsonPath('image_url', null);

        $this->post('/api/admin/products/kefir-1l/photo', [
            'photo' => UploadedFile::fake()->image('kefir.jpg', 1200, 1200),
        ])->assertOk()->assertJsonPath('has_upload', true);

        $row = collect($this->getJson('/api/catalogue')->json('products'))
            ->firstWhere('id', 'kefir-1l');

        $this->assertNull($row['image']);
        $this->assertNotNull($row['image_url']);
    }

    public function test_a_customer_cannot_add_a_product(): void
    {
        $this->signInAs(User::factory()->create());

        $before = Product::count();

        $this->postJson('/api/admin/products', $this->payload())->assertNotFound();
        $this->assertSame($before, Product::count());
    }

    public function test_creating_a_product_is_recorded(): void
    {
        $this->signInAs($this->admin());
        $this->postJson('/api/admin/products', $this->payload())->assertCreated();

        $this->assertDatabaseHas('admin_audits', [
            'action' => 'product.create',
            'subject_id' => 'kefir-1l',
        ]);
    }
}
