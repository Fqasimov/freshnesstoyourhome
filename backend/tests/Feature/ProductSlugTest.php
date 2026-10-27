<?php

namespace Tests\Feature;

use App\Models\Product;
use App\Models\User;
use App\Support\CatalogueCache;
use App\Support\Slug;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;
use Tests\TestCase;

/**
 * Every product has a page on the website at /mehsul/{slug}, made from its
 * Azerbaijani name. Once Google knows an address it has to keep working, so
 * the slug is written once and survives renames of both the name and the code.
 */
class ProductSlugTest extends TestCase
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

    public function test_azerbaijani_letters_become_what_people_type(): void
    {
        $this->assertSame('hise-verilmis-qizil-baliq-smoked-salmon', Slug::of('Hisə verilmiş Qızıl balıq (Smoked Salmon)'));
        $this->assertSame('qirmizi-kuru-500-q', Slug::of('Qırmızı kürü — 500 q'));
        $this->assertSame('sokolad-sud-ugurlu', Slug::of('ŞOKOLAD Süd Uğurlu'));
        $this->assertSame('istiot', Slug::of('İstiot'));
    }

    public function test_every_seeded_product_has_its_own_slug(): void
    {
        $slugs = Product::pluck('slug');

        $this->assertNotContains(null, $slugs->all());
        $this->assertSame($slugs->count(), $slugs->unique()->count());
        $this->assertSame('hise-verilmis-qizil-baliq-smoked-salmon', Product::find('smoked-salmon')->slug);
    }

    public function test_the_catalogue_sends_the_slug(): void
    {
        Cache::forget(CatalogueCache::KEY);

        $salmon = collect($this->getJson('/api/catalogue')->assertOk()->json('products'))->firstWhere('id', 'smoked-salmon');

        $this->assertSame('hise-verilmis-qizil-baliq-smoked-salmon', $salmon['slug']);
    }

    public function test_a_new_product_gets_a_slug_and_a_namesake_is_told_apart(): void
    {
        $this->asAdmin();

        $make = fn (string $id, string $unit) => $this->postJson('/api/admin/products', [
            'id' => $id, 'category_id' => 'cheese', 'price_minor' => 900, 'unit_kind' => 'pc',
            'translations' => ['az' => ['name' => 'Burrata pendiri', 'unit_label' => $unit]],
        ])->assertCreated()->json('slug');

        // The seeded burrata already holds "burrata-pendiri".
        $this->assertSame('burrata-pendiri-125-gr', $make('burrata-small', '125 gr'));
        $this->assertSame('burrata-pendiri-2', $make('burrata-small-2', '125 gr'));
    }

    public function test_renaming_the_product_or_its_code_keeps_the_address(): void
    {
        $this->asAdmin();
        $before = Product::find('smoked-salmon')->slug;

        $this->patchJson('/api/admin/products/smoked-salmon', [
            'new_id' => 'salmon-cold-smoked',
            'translations' => ['az' => ['name' => 'Soyuq hisə verilmiş qızıl balıq']],
        ])->assertOk()->assertJsonPath('slug', $before);

        $this->assertSame($before, Product::find('salmon-cold-smoked')->slug);
    }

    public function test_the_panel_can_set_a_slug_but_only_a_clean_unique_one(): void
    {
        $this->asAdmin();

        $this->patchJson('/api/admin/products/red-caviar', ['slug' => 'qirmizi-kuru-200q'])
            ->assertOk()->assertJsonPath('slug', 'qirmizi-kuru-200q');

        $this->patchJson('/api/admin/products/smoked-salmon', ['slug' => 'qirmizi-kuru-200q'])->assertStatus(422);
        $this->patchJson('/api/admin/products/smoked-salmon', ['slug' => 'Qırmızı kürü'])->assertStatus(422);
        $this->patchJson('/api/admin/products/smoked-salmon', ['slug' => '../x'])->assertStatus(422);
    }

    public function test_categories_have_search_friendly_addresses(): void
    {
        $this->assertSame('kuru', \App\Models\Category::find('kuruler')->slug);
        $this->assertSame('hise-verilmis-baliq', \App\Models\Category::find('smoked')->slug);

        Cache::forget(CatalogueCache::KEY);
        $cats = collect($this->getJson('/api/catalogue')->assertOk()->json('categories'));
        $this->assertSame('deniz-mehsullari', $cats->firstWhere('id', 'seafood')['slug']);

        $this->asAdmin();
        $this->postJson('/api/admin/categories', ['id' => 'dondurma', 'translations' => ['az' => ['name' => 'Dondurma']]])
            ->assertCreated()->assertJsonPath('slug', 'dondurma');
    }
}
