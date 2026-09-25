<?php

namespace Tests\Feature;

use App\Models\AdminAudit;
use App\Models\User;
use App\Support\Audit;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

/**
 * The audit trail is tamper-evident: changing or removing a row in the middle
 * shows up, and the key is not in the database.
 */
class AuditChainTest extends TestCase
{
    use RefreshDatabase;

    private function write(int $n): void
    {
        $admin = User::factory()->admin()->create();
        for ($i = 1; $i <= $n; $i++) {
            Audit::record($admin, 'product.update', 'product', 'smoked-salmon', [
                'price_minor' => ['from' => 1000 * $i, 'to' => 1000 * $i + 500],
                'name' => ['from' => ['en' => 'a', 'az' => 'ə'], 'to' => ['az' => 'b', 'en' => 'b']],
            ]);
        }
    }

    public function test_an_untouched_trail_verifies(): void
    {
        $this->write(5);

        $this->assertSame(['intact' => true, 'checked' => 5, 'unchained' => 0, 'broken_at' => null], Audit::verify());
    }

    public function test_editing_a_row_is_caught(): void
    {
        $this->write(5);
        $third = AdminAudit::orderBy('id')->skip(2)->first();

        // Straight at the database, as a leaked backup or an injection would.
        DB::table('admin_audits')->where('id', $third->id)
            ->update(['changes' => json_encode(['price_minor' => ['from' => 1, 'to' => 2]])]);

        $result = Audit::verify();
        $this->assertFalse($result['intact']);
        $this->assertSame($third->id, $result['broken_at']);
    }

    public function test_deleting_a_row_is_caught(): void
    {
        $this->write(5);
        $second = AdminAudit::orderBy('id')->skip(1)->first();

        DB::table('admin_audits')->where('id', $second->id)->delete();

        $this->assertFalse(Audit::verify()['intact']);
    }

    public function test_recomputing_a_plain_hash_does_not_help_without_the_key(): void
    {
        $this->write(3);
        $last = AdminAudit::orderByDesc('id')->first();

        // An attacker with the database but not .env can only guess at the
        // hash; an unkeyed SHA-256 of the same content is not it.
        DB::table('admin_audits')->where('id', $last->id)->update([
            'ip' => '10.9.9.9',
            'hash' => hash('sha256', $last->prev_hash.'|forged'),
        ]);

        $this->assertFalse(Audit::verify()['intact']);
    }

    public function test_rows_from_before_the_chain_are_counted_not_judged(): void
    {
        DB::table('admin_audits')->insert([
            'action' => 'product.update', 'subject_type' => 'product', 'created_at' => now(),
        ]);
        $this->write(2);

        $this->assertSame(['intact' => true, 'checked' => 2, 'unchained' => 1, 'broken_at' => null], Audit::verify());
    }

    public function test_the_panel_can_ask_and_records_who_and_from_where(): void
    {
        $this->seedCatalogue();
        $this->write(2);
        $this->signInAs(User::factory()->admin()->create());

        $this->withHeader('User-Agent', 'Test Browser 1.0')
            ->patchJson('/api/admin/products/smoked-salmon', ['price_minor' => 4_321])
            ->assertOk();

        $this->getJson('/api/admin/audits/verify')->assertOk()->assertJson(['intact' => true]);
        $this->assertSame('Test Browser 1.0', AdminAudit::latest('id')->first()->user_agent);
    }
}
