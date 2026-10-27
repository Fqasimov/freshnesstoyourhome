<?php

namespace Tests\Feature;

use App\Models\User;
use App\Support\CatalogueCache;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;
use Tests\TestCase;

/**
 * Category texts and collection pages, written in the panel and served with
 * the catalogue, so the website shows them without a rebuild.
 */
class PageContentTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seedCatalogue();
        $this->signInAs(User::factory()->admin()->create()->fresh());
    }

    private function catalogue(): array
    {
        Cache::forget(CatalogueCache::KEY);

        return $this->getJson('/api/catalogue')->assertOk()->json();
    }

    public function test_a_category_page_gets_its_own_words_in_each_language(): void
    {
        $this->patchJson('/api/admin/categories/kuruler', [
            'is_indexed' => true,
            'translations' => [
                'az' => ['seo_title' => 'Qırmızı və qara kürü Bakıda', 'h1' => 'Kürü', 'body' => "Birinci abzas.\n\nİkinci abzas."],
                'ru' => ['seo_title' => 'Красная и чёрная икра в Баку'],
            ],
        ])->assertOk();

        $kuru = collect($this->catalogue()['categories'])->firstWhere('id', 'kuruler');
        $this->assertSame('Qırmızı və qara kürü Bakıda', $kuru['seo_title']['az']);
        $this->assertSame('Красная и чёрная икра в Баку', $kuru['seo_title']['ru']);
        $this->assertSame("Birinci abzas.\n\nİkinci abzas.", $kuru['body']['az']);
        // A language that only got page text still has a name.
        $this->assertNotEmpty($kuru['name']['ru']);

        // Emptying a field hands it back to the template.
        $this->patchJson('/api/admin/categories/kuruler', ['translations' => ['az' => ['h1' => '']]])->assertOk();
        $kuru = collect($this->catalogue()['categories'])->firstWhere('id', 'kuruler');
        $this->assertArrayNotHasKey('az', $kuru['h1']);
    }

    public function test_a_category_can_be_kept_out_of_google(): void
    {
        $this->patchJson('/api/admin/categories/diger', ['is_indexed' => false])->assertOk();
        $this->assertFalse(collect($this->catalogue()['categories'])->firstWhere('id', 'diger')['is_indexed']);
    }

    public function test_a_collection_page_shows_only_what_can_be_bought(): void
    {
        $id = $this->postJson('/api/admin/collections', [
            'slug' => 'yeni-il-setleri',
            'translations' => ['az' => ['name' => 'Yeni il setləri', 'body' => 'Bayram süfrəsi üçün.']],
            'products' => ['smoked-salmon', 'red-caviar'],
        ])->assertCreated()->json('id');

        $page = collect($this->catalogue()['collections'])->firstWhere('slug', 'yeni-il-setleri');
        $this->assertSame(['smoked-salmon', 'red-caviar'], $page['products']);
        $this->assertSame('Yeni il setləri', $page['name']['az']);

        // Out of stock: off the page, not an error.
        \App\Models\Product::whereKey('red-caviar')->update(['in_stock' => false]);
        $page = collect($this->catalogue()['collections'])->firstWhere('slug', 'yeni-il-setleri');
        $this->assertSame(['smoked-salmon'], $page['products']);

        // Switched off: not served at all.
        $this->patchJson("/api/admin/collections/{$id}", ['is_active' => false])->assertOk();
        $this->assertNull(collect($this->catalogue()['collections'])->firstWhere('slug', 'yeni-il-setleri'));
    }

    public function test_categories_and_collections_never_share_an_address(): void
    {
        $this->postJson('/api/admin/collections', [
            'slug' => 'kuru', 'translations' => ['az' => ['name' => 'X']], 'products' => ['smoked-salmon'],
        ])->assertStatus(422);

        $this->postJson('/api/admin/collections', [
            'slug' => 'bayram', 'translations' => ['az' => ['name' => 'Bayram']], 'products' => ['smoked-salmon'],
        ])->assertCreated();
        $this->patchJson('/api/admin/categories/kuruler', ['slug' => 'bayram'])->assertStatus(422);
    }

    public function test_renaming_a_product_keeps_it_on_its_collection_page(): void
    {
        $this->postJson('/api/admin/collections', [
            'slug' => 'bayram', 'translations' => ['az' => ['name' => 'Bayram']], 'products' => ['smoked-salmon'],
        ])->assertCreated();
        $this->patchJson('/api/admin/products/smoked-salmon', ['new_id' => 'salmon-cold'])->assertOk();

        $page = collect($this->catalogue()['collections'])->firstWhere('slug', 'bayram');
        $this->assertSame(['salmon-cold'], $page['products']);
    }
}
