<?php

namespace Tests\Feature;

use App\Models\Product;
use App\Models\User;
use App\Support\CatalogueCache;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

/**
 * The SEO audit of 11 Nov 2026: long descriptions, brands and barcodes, a
 * category intro and FAQ, old addresses that keep working, and out-of-stock
 * products that keep their page.
 */
class SeoFieldsTest extends TestCase
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

    public function test_a_product_carries_its_long_description_brand_and_barcode(): void
    {
        $this->patchJson('/api/admin/products/smoked-salmon', [
            'brand' => 'Flagman',
            'gtin' => '4601234567893',
            'translations' => ['az' => ['long_description' => 'Uzun mətn.'], 'ru' => ['long_description' => 'Длинный текст.']],
        ])->assertOk()->assertJsonPath('brand', 'Flagman');

        $p = collect($this->catalogue()['products'])->firstWhere('id', 'smoked-salmon');
        $this->assertSame('Flagman', $p['brand']);
        $this->assertSame('4601234567893', $p['gtin']);
        $this->assertSame('Uzun mətn.', $p['long_description']['az']);
        $this->assertSame('Длинный текст.', $p['long_description']['ru']);

        $this->patchJson('/api/admin/products/smoked-salmon', ['gtin' => '12ab'])
            ->assertStatus(422)->assertJsonValidationErrors('gtin');
    }

    public function test_a_moved_address_redirects_to_the_new_one_and_can_be_taken_back(): void
    {
        $old = Product::findOrFail('smoked-salmon')->slug;

        $this->patchJson('/api/admin/products/smoked-salmon', ['slug' => 'hise-verilmis-qizil-baliq-1-kq'])->assertOk();
        $this->assertSame('hise-verilmis-qizil-baliq-1-kq', $this->catalogue()['redirects'][$old]);

        // Moving it again: the first address now leads to the newest one.
        $this->patchJson('/api/admin/products/smoked-salmon', ['slug' => 'qizil-baliq'])->assertOk();
        $r = $this->catalogue()['redirects'];
        $this->assertSame('qizil-baliq', $r[$old]);
        $this->assertSame('qizil-baliq', $r['hise-verilmis-qizil-baliq-1-kq']);

        // And back to the original: that address is a page again, not a redirect.
        $this->patchJson('/api/admin/products/smoked-salmon', ['slug' => $old])->assertOk();
        $this->assertArrayNotHasKey($old, $this->catalogue()['redirects']);
    }

    /** The catalogue is cached serialised: what comes back must still be a plain map. */
    public function test_redirects_survive_the_cache(): void
    {
        // A store that serialises, as the host's does; the array store does not.
        config(['cache.default' => 'file']);
        $old = Product::findOrFail('smoked-salmon')->slug;
        $this->patchJson('/api/admin/products/smoked-salmon', ['slug' => 'qizil-baliq'])->assertOk();
        Cache::forget(CatalogueCache::KEY);
        $this->getJson('/api/catalogue')->assertOk();
        // Second request: from the cache.
        $r = $this->getJson('/api/catalogue')->assertOk()->json('redirects');
        $this->assertSame([$old => 'qizil-baliq'], $r);
        Cache::forget(CatalogueCache::KEY);
    }

    public function test_an_out_of_stock_product_keeps_its_page_but_is_not_orderable(): void
    {
        $this->patchJson('/api/admin/products/smoked-salmon', ['in_stock' => false])->assertOk();
        $c = $this->catalogue();

        $this->assertNull(collect($c['products'])->firstWhere('id', 'smoked-salmon'));
        $p = collect($c['unavailable'])->firstWhere('id', 'smoked-salmon');
        $this->assertNotNull($p);
        $this->assertFalse($p['in_stock']);
    }

    public function test_a_category_gets_an_intro_and_a_faq_of_whole_pairs(): void
    {
        $this->patchJson('/api/admin/categories/kuruler', ['translations' => ['az' => [
            'intro' => 'Qısa giriş.',
            'faq' => [
                ['q' => 'Kürü necə saxlanır?', 'a' => 'Soyuducuda, 0–4 °C.'],
                ['q' => 'Cavabsız sual', 'a' => ''],
            ],
        ]]])->assertOk();

        $kuru = collect($this->catalogue()['categories'])->firstWhere('id', 'kuruler');
        $this->assertSame('Qısa giriş.', $kuru['intro']['az']);
        $this->assertSame([['q' => 'Kürü necə saxlanır?', 'a' => 'Soyuducuda, 0–4 °C.']], $kuru['faq']['az']);

        $this->patchJson('/api/admin/categories/kuruler', ['translations' => ['az' => ['faq' => []]]])->assertOk();
        $this->assertArrayNotHasKey('az', collect($this->catalogue()['categories'])->firstWhere('id', 'kuruler')['faq']);
    }

    public function test_the_audit_fixes_rename_and_redirect_once(): void
    {
        $id = DB::table('products')->where('slug', 'qirmizi-ikra')->value('id')
            ?? tap(Product::firstOrFail()->id, fn ($x) => DB::table('products')->where('id', $x)->update(['slug' => 'qirmizi-ikra']));
        DB::table('product_translations')->where('product_id', $id)->where('locale', 'az')->update(['name' => 'Quadratto Pistacchio']);

        $migration = require database_path('migrations/2026_11_12_091000_fix_product_names_and_slugs.php');
        $migration->up();
        $migration->up();

        $this->assertSame('qirmizi-keta-kurusu-200-q', DB::table('products')->where('id', $id)->value('slug'));
        $this->assertSame('Quadrotto Pistacchio', DB::table('product_translations')->where('product_id', $id)->where('locale', 'az')->value('name'));
        $this->assertSame('qirmizi-keta-kurusu-200-q', $this->catalogue()['redirects']['qirmizi-ikra'] ?? null);
    }
}
