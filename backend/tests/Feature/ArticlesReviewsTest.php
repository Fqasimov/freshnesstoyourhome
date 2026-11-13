<?php

namespace Tests\Feature;

use App\Models\Review;
use App\Models\User;
use App\Support\CatalogueCache;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;
use Tests\TestCase;

/** Recipes on the website, moderated reviews, and moved category pages. */
class ArticlesReviewsTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seedCatalogue();
    }

    private function catalogue(): array
    {
        Cache::forget(CatalogueCache::KEY);

        return $this->getJson('/api/catalogue')->assertOk()->json();
    }

    private function admin(): void
    {
        $this->signInAs(User::factory()->admin()->create()->fresh());
    }

    public function test_only_published_articles_reach_the_website(): void
    {
        $this->admin();
        $id = $this->postJson('/api/admin/articles', [
            'slug' => 'qirmizi-kuru-nece-verilir',
            'products' => ['smoked-salmon'],
            'translations' => ['az' => ['title' => 'Qırmızı kürü necə verilir', 'body' => "Mətn.\n\n## Alt başlıq"], 'ru' => ['title' => 'Как подавать икру']],
        ])->assertCreated()->json('id');

        $this->assertSame([], $this->catalogue()['articles']);

        $this->patchJson("/api/admin/articles/{$id}", ['is_published' => true])->assertOk();
        $a = $this->catalogue()['articles'][0];
        $this->assertSame('qirmizi-kuru-nece-verilir', $a['slug']);
        $this->assertSame('Как подавать икру', $a['title']['ru']);
        $this->assertSame(['smoked-salmon'], $a['products']);

        $this->postJson('/api/admin/articles', ['slug' => 'qirmizi-kuru-nece-verilir', 'translations' => ['az' => ['title' => 'x']]])
            ->assertStatus(422)->assertJsonValidationErrors('slug');
    }

    public function test_a_review_shows_only_once_approved(): void
    {
        $this->postJson('/api/reviews', ['product_id' => 'smoked-salmon', 'name' => 'Aysel', 'rating' => 5, 'text' => 'Çox dadlı.'])
            ->assertCreated();
        $this->assertArrayNotHasKey('reviews', collect($this->catalogue()['products'])->firstWhere('id', 'smoked-salmon'));

        $this->admin();
        $this->patchJson('/api/admin/reviews/'.Review::first()->id, ['status' => 'approved'])->assertOk();
        $p = collect($this->catalogue()['products'])->firstWhere('id', 'smoked-salmon');
        $this->assertSame(1, $p['reviews']['count']);
        $this->assertEquals(5, $p['reviews']['rating']);
        $this->assertSame('Çox dadlı.', $p['reviews']['latest'][0]['text']);
    }

    public function test_a_review_cannot_carry_links_or_a_bad_rating_and_bots_are_turned_away(): void
    {
        $this->withoutMiddleware(\Illuminate\Routing\Middleware\ThrottleRequests::class);
        $ok = ['product_id' => 'smoked-salmon', 'name' => 'Aysel', 'rating' => 4];
        $this->postJson('/api/reviews', [...$ok, 'text' => 'see https://spam.example'])->assertStatus(422)->assertJsonValidationErrors('text');
        $this->postJson('/api/reviews', [...$ok, 'rating' => 6])->assertStatus(422)->assertJsonValidationErrors('rating');
        $this->postJson('/api/reviews', [...$ok, 'website' => 'x'])->assertStatus(422);
        $this->postJson('/api/reviews', [...$ok, 'product_id' => 'nope'])->assertStatus(422);
        $this->assertSame(0, Review::count());
    }

    public function test_a_moved_category_redirects(): void
    {
        $this->admin();
        $this->patchJson('/api/admin/categories/kuruler', ['slug' => 'kuru-ve-ikra'])->assertOk();
        $this->assertSame('kuru-ve-ikra', $this->catalogue()['category_redirects']['kuru']);
    }
}
