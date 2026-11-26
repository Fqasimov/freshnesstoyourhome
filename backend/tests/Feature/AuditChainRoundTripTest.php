<?php

namespace Tests\Feature;

use App\Models\User;
use App\Support\Audit;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/** Every kind of panel edit, then the journal's own check. */
class AuditChainRoundTripTest extends TestCase
{
    use RefreshDatabase;

    public function test_the_chain_survives_every_kind_of_edit(): void
    {
        $this->seedCatalogue();
        $this->signInAs(User::factory()->admin()->create()->fresh());
        $this->withoutMiddleware(\Illuminate\Routing\Middleware\ThrottleRequests::class);

        $this->patchJson('/api/admin/products/smoked-salmon', [
            'price_minor' => 6600, 'unit_qty' => 1, 'brand' => 'Flagman', 'gtin' => '4601234567893',
            'discount_kind' => 'percent', 'discount_percent' => 10, 'discount_show' => 'percent',
            'translations' => ['az' => ['long_description' => "Uzun mətn 🐟\nİkinci sətir — «test» / 1/2"]],
        ])->assertOk();
        $this->patchJson('/api/admin/products/smoked-salmon', ['unit_qty' => 0.5, 'discount_percent' => 16.4, 'slug' => 'qizil-baliq-test'])->assertOk();
        $this->patchJson('/api/admin/products/smoked-salmon', ['discount_kind' => null])->assertOk();
        $this->postJson('/api/admin/products/stock', ['ids' => ['smoked-salmon', 'burrata-plain'], 'in_stock' => false])->assertOk();
        $this->postJson('/api/admin/products/stock', ['ids' => ['burrata-plain'], 'in_stock' => true])->assertOk();
        $this->patchJson('/api/admin/categories/kuruler', ['slug' => 'kuru-2', 'is_indexed' => false, 'translations' => ['ru' => [
            'intro' => 'Икра', 'faq' => [['q' => 'Как?', 'a' => 'Так.']], 'seo_title' => 'Икра в Баку',
        ]]])->assertOk();
        $c = $this->postJson('/api/admin/collections', ['slug' => 'yeni-il', 'translations' => ['az' => ['name' => 'Yeni il']], 'products' => ['smoked-salmon']])->assertCreated()->json('id');
        $this->patchJson("/api/admin/collections/{$c}", ['is_active' => false])->assertOk();
        $a = $this->postJson('/api/admin/articles', ['slug' => 'kuru', 'translations' => ['az' => ['title' => 'Kürü']]])->assertCreated()->json('id');
        $this->patchJson("/api/admin/articles/{$a}", ['is_published' => true])->assertOk();
        $this->postJson('/api/reviews', ['product_id' => 'smoked-salmon', 'name' => 'Aysel', 'rating' => 5])->assertCreated();
        $r = \App\Models\Review::first()->id;
        $this->patchJson("/api/admin/reviews/{$r}", ['status' => 'approved'])->assertOk();
        $this->deleteJson("/api/admin/reviews/{$r}")->assertOk();

        $result = Audit::verify();
        $this->assertTrue($result['intact'], json_encode($result));
        $this->assertGreaterThan(8, $result['checked']);
    }

    /** A row written the old way (10.0 sealed, 10 stored) still checks out; a changed one does not. */
    public function test_rows_written_before_the_fix_still_verify_and_edits_are_still_caught(): void
    {
        $this->seedCatalogue();
        Audit::record(null, 'product.update', 'product', 'smoked-salmon', ['discount_percent' => ['from' => 16.4, 'to' => 10.0], 'price_minor' => ['from' => 6500, 'to' => 6600]]);
        Audit::record(null, 'product.update', 'product', 'smoked-salmon', ['unit_qty' => ['from' => 1.0, 'to' => 2.0]]);
        // What the old "array" cast left in the database.
        \Illuminate\Support\Facades\DB::table('admin_audits')->where('id', 1)
            ->update(['changes' => '{"discount_percent":{"from":16.4,"to":10},"price_minor":{"from":6500,"to":6600}}']);
        \Illuminate\Support\Facades\DB::table('admin_audits')->where('id', 2)
            ->update(['changes' => '{"unit_qty":{"from":1,"to":2}}']);
        $this->assertTrue(Audit::verify()["intact"], json_encode(Audit::verify()));

        // A real change to a value is still an alteration.
        \Illuminate\Support\Facades\DB::table('admin_audits')->where('id', 1)
            ->update(['changes' => '{"discount_percent":{"from":16.4,"to":11},"price_minor":{"from":6500,"to":6600}}']);
        $this->assertSame(1, Audit::verify()['broken_at']);
    }
}
