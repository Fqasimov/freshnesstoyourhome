<?php

namespace Tests\Feature;

use App\Models\Order;
use App\Models\OrderEvent;
use App\Models\User;
use Illuminate\Encryption\Encrypter;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

/**
 * What a thief with a copy of the database sees, and what changing the key does.
 */
class EncryptionAtRestTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seedCatalogue();
    }

    private function cancelledOrder(string $reason): Order
    {
        [$user, $address] = $this->customerWithAddress(['name' => 'Nicat', 'phone' => '+994501112233']);
        $this->signInAs($user);
        $order = $this->postJson('/api/orders', $this->orderPayload($address, ['smoked-salmon' => 1]))->assertCreated()->json();
        $this->postJson("/api/orders/{$order['id']}/cancel", ['reason' => $reason])->assertOk();

        return Order::findOrFail($order['id']);
    }

    public function test_what_a_customer_types_is_not_readable_in_the_database(): void
    {
        $order = $this->cancelledOrder('Plans changed, ring 0501234567');

        $rawReason = DB::table('orders')->where('id', $order->id)->value('cancel_reason');
        $rawNote = DB::table('order_events')->where('order_id', $order->id)->whereNotNull('note')->value('note');

        $this->assertNotNull($rawReason);
        $this->assertStringNotContainsString('0501234567', $rawReason);
        $this->assertStringNotContainsString('0501234567', (string) $rawNote);
        // …and the application still reads it.
        $this->assertSame('Plans changed, ring 0501234567', $order->fresh()->cancel_reason);
    }

    public function test_text_written_before_encryption_is_still_read(): void
    {
        $order = $this->cancelledOrder('x');
        DB::table('orders')->where('id', $order->id)->update(['cancel_reason' => 'written in plain text']);

        $this->assertSame('written in plain text', $order->fresh()->cancel_reason);
    }

    public function test_sign_in_codes_do_not_keep_where_they_were_asked_from(): void
    {
        $this->postJson('/api/auth/request-code', ['email' => 'someone@example.com'])->assertOk();

        $this->assertSame(0, DB::table('login_codes')->whereNotNull('request_ip')->count());
    }

    public function test_the_encryption_key_can_be_changed_without_losing_anything(): void
    {
        $order = $this->cancelledOrder('Key rotation test');
        $user = User::first();
        $oldKey = config('app.key');

        // A new key, with the old one still allowed to read.
        $newKey = 'base64:'.base64_encode(random_bytes(32));
        $old = new Encrypter(base64_decode(substr($oldKey, 7)), config('app.cipher'));
        $new = (new Encrypter(base64_decode(substr($newKey, 7)), config('app.cipher')))->previousKeys([base64_decode(substr($oldKey, 7))]);
        Crypt::swap($new);

        // Still readable through the previous key…
        $this->assertSame('Key rotation test', $order->fresh()->cancel_reason);
        $this->assertSame('Nicat', $user->fresh()->name);

        // …and after re-encrypting, readable with the new key alone.
        $this->assertSame(0, Artisan::call('freshness:reencrypt'));
        Crypt::swap(new Encrypter(base64_decode(substr($newKey, 7)), config('app.cipher')));

        $this->assertSame('Key rotation test', $order->fresh()->cancel_reason);
        $this->assertSame('Nicat', $user->fresh()->name);
        $this->assertSame('+994501112233', $user->fresh()->phone);

        // And the old key alone can no longer read what was rewritten.
        $raw = DB::table('users')->where('id', $user->id)->value('name');
        $this->expectException(\Illuminate\Contracts\Encryption\DecryptException::class);
        $old->decryptString($raw);
    }

    public function test_a_dry_run_changes_nothing(): void
    {
        $this->cancelledOrder('Dry run');
        $before = DB::table('orders')->pluck('cancel_reason', 'id')->all();

        $this->assertSame(0, Artisan::call('freshness:reencrypt', ['--dry-run' => true]));

        $this->assertSame($before, DB::table('orders')->pluck('cancel_reason', 'id')->all());
    }

    public function test_the_reencrypt_route_is_closed_without_the_deploy_token(): void
    {
        config(['freshness.deploy_token' => str_repeat('a', 40)]);

        $this->postJson('/api/deploy/reencrypt')->assertNotFound();
        $this->postJson('/api/deploy/reencrypt', [], ['X-Deploy-Token' => 'wrong'])->assertNotFound();
        $this->postJson('/api/deploy/reencrypt', [], ['X-Deploy-Token' => str_repeat('a', 40)])->assertOk();
    }

    public function test_the_migration_encrypts_old_plain_text_and_leaves_ciphertext_alone(): void
    {
        $order = $this->cancelledOrder('already encrypted');
        DB::table('order_events')->where('order_id', $order->id)->whereNotNull('note')->limit(1)->update(['note' => 'old plain note']);
        $encryptedBefore = DB::table('orders')->where('id', $order->id)->value('cancel_reason');

        $migration = require database_path('migrations/2026_10_10_090000_encrypt_free_text_columns.php');
        $migration->up();
        $migration->up(); // twice is the same as once

        $note = DB::table('order_events')->where('order_id', $order->id)->whereNotNull('note')->value('note');
        $this->assertStringNotContainsString('old plain note', $note);
        $this->assertSame('old plain note', Crypt::decryptString($note));
        $this->assertSame($encryptedBefore, DB::table('orders')->where('id', $order->id)->value('cancel_reason'));
    }
}
