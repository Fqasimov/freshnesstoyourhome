<?php

namespace Tests\Feature;

use App\Mail\LoginCodeMail;
use App\Models\Category;
use App\Models\Order;
use App\Models\Product;
use App\Models\User;
use App\Support\BlindIndex;
use Firebase\JWT\JWT;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Mail;
use Tests\TestCase;

/**
 * One test per finding of the October 2026 mobile-app security pass (the app
 * and the API it calls), each asserting the fixed behaviour.
 */
class MobileAuditFixesTest extends TestCase
{
    use RefreshDatabase;

    private array $rsa;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seedCatalogue();
        Mail::fake();
    }

    // ------------------------------------------------------------ social ---

    private function provider(string $name, string $aud): void
    {
        $key = openssl_pkey_new(['private_key_bits' => 2048, 'private_key_type' => OPENSSL_KEYTYPE_RSA]);
        openssl_pkey_export($key, $pem);
        $d = openssl_pkey_get_details($key)['rsa'];
        $b64 = fn ($v) => rtrim(strtr(base64_encode($v), '+/', '-_'), '=');

        $this->rsa = ['pem' => $pem];
        config(["freshness.social.{$name}" => [$aud]]);
        Cache::flush();

        Http::fake([
            '*' => Http::response(['keys' => [[
                'kty' => 'RSA', 'alg' => 'RS256', 'use' => 'sig', 'kid' => 'k1',
                'n' => $b64($d['n']), 'e' => $b64($d['e']),
            ]]]),
        ]);
    }

    private function idToken(array $claims): string
    {
        return JWT::encode(array_merge(['iat' => time(), 'exp' => time() + 600], $claims), $this->rsa['pem'], 'RS256', 'k1');
    }

    public function test_google_cannot_open_a_new_account_on_an_address_it_does_not_own(): void
    {
        // Whoever holds a Google account on someone else's work address would
        // otherwise claim it first, and keep the link after the owner signs up.
        $this->provider('google', 'web-client');

        $this->postJson('/api/auth/social/google', ['id_token' => $this->idToken([
            'iss' => 'accounts.google.com', 'aud' => 'web-client', 'sub' => 'g1', 'email' => 'boss@company.example', 'email_verified' => true,
        ])])->assertStatus(409)->assertJsonPath('code', 'email_signup_required');

        $this->assertSame(0, User::count());
    }

    public function test_apple_joins_an_account_only_on_an_address_apple_owns(): void
    {
        $this->provider('apple', 'az.freshnesstoyourhome.app');
        $other = User::factory()->create(['email' => 'someone@company.example']);
        $icloud = User::factory()->create(['email' => 'someone@icloud.com']);

        $token = fn (string $sub, string $email) => $this->idToken([
            'iss' => 'https://appleid.apple.com', 'aud' => 'az.freshnesstoyourhome.app',
            'sub' => $sub, 'email' => $email, 'email_verified' => 'true',
        ]);

        $this->postJson('/api/auth/social/apple', ['id_token' => $token('a1', 'someone@company.example')])
            ->assertStatus(409)->assertJsonPath('code', 'account_exists');
        $this->assertNull($other->fresh()->apple_id_hash);

        $this->postJson('/api/auth/social/apple', ['id_token' => $token('a2', 'someone@icloud.com')])
            ->assertOk()->assertJsonPath('user.id', $icloud->id);
    }

    public function test_a_password_reset_removes_google_and_apple_links(): void
    {
        $user = User::factory()->create(['email' => 'reset@example.com']);
        $user->forceFill([
            'google_id_hash' => BlindIndex::ofProvider('google', 'stale'),
            'apple_id_hash' => BlindIndex::ofProvider('apple', 'stale'),
        ])->save();

        $ticket = $this->postJson('/api/auth/password/forgot', [
            'email' => 'reset@example.com', 'password' => 'Brand-new1!', 'password_confirmation' => 'Brand-new1!',
        ])->assertOk()->json('ticket');

        $code = null;
        Mail::assertQueued(LoginCodeMail::class, function (LoginCodeMail $m) use (&$code) {
            $code = $m->code;

            return true;
        });

        $this->postJson('/api/auth/confirm', ['ticket' => $ticket, 'email' => 'reset@example.com', 'code' => $code])->assertOk();

        $user->refresh();
        $this->assertNull($user->google_id_hash);
        $this->assertNull($user->apple_id_hash);
    }

    public function test_social_sign_ins_do_not_share_one_bucket(): void
    {
        // They carry no email field. Under the password limiter every one of
        // them counted against the same empty address, so ten requests from
        // anywhere locked everybody out of Google and Apple sign-in.
        $this->provider('google', 'web-client');

        for ($i = 0; $i < 12; $i++) {
            $this->withServerVariables(['REMOTE_ADDR' => "10.1.0.{$i}"])
                ->postJson('/api/auth/social/google', ['id_token' => 'not-a-token'])
                ->assertStatus(422);
        }
    }

    public function test_one_ipv6_network_is_one_source(): void
    {
        for ($i = 1; $i <= 3; $i++) {
            $this->withServerVariables(['REMOTE_ADDR' => "2001:db8:1:2::{$i}"])
                ->postJson('/api/auth/request-code', ['email' => "a{$i}@example.com"]);
        }

        $this->withServerVariables(['REMOTE_ADDR' => '2001:db8:1:2:ffff::9'])
            ->postJson('/api/auth/request-code', ['email' => 'a9@example.com'])
            ->assertStatus(429);
    }

    public function test_a_pending_sign_up_is_not_readable_in_the_cache(): void
    {
        $ticket = $this->postJson('/api/auth/register', [
            'name' => 'Nicat Məmmədov', 'email' => 'nicat@example.com', 'date_of_birth' => '1995-04-12',
            'password' => 'Fresh-fish1', 'password_confirmation' => 'Fresh-fish1', 'locale' => 'az',
        ])->assertOk()->json('ticket');

        $stored = Cache::get('signup:'.hash('sha256', $ticket));

        $this->assertIsString($stored);
        $this->assertStringNotContainsString('nicat@example.com', $stored);
        $this->assertStringNotContainsString('1995-04-12', $stored);
    }

    // ------------------------------------------------------------ orders ---

    private function order(): Order
    {
        [$user, $address] = $this->customerWithAddress(['phone' => '+994501234567']);
        $this->signInAs($user);
        $this->postJson('/api/orders', $this->orderPayload($address, ['smoked-salmon' => 1]))->assertCreated();

        return Order::with('items')->first();
    }

    public function test_a_courier_cannot_reach_a_closed_order(): void
    {
        $order = $this->order();
        $order->forceFill(['status' => Order::DELIVERED])->save();

        $this->signInAs(User::factory()->courier()->create()->fresh());

        $this->getJson("/api/staff/orders/{$order->id}")->assertNotFound();
        $this->postJson("/api/staff/orders/{$order->id}/transition", ['status' => 'cancelled'])->assertNotFound();
    }

    public function test_a_courier_cannot_weigh_far_below_the_order(): void
    {
        $order = $this->order();
        $item = $order->items->first();

        $this->signInAs(User::factory()->courier()->create()->fresh());

        $this->postJson("/api/staff/orders/{$order->id}/weights", [
            'weights' => [(string) $item->id => 0.05],
        ])->assertStatus(422);

        $this->assertNull($order->fresh()->final_total_minor);
    }

    public function test_a_transition_reply_to_a_courier_carries_no_contact_details(): void
    {
        $order = $this->order();

        $this->signInAs(User::factory()->courier()->create()->fresh());

        $reply = $this->postJson("/api/staff/orders/{$order->id}/transition", ['status' => 'confirmed'])
            ->assertOk()->json();

        $this->assertNull($reply['contact_phone']);
    }

    public function test_a_product_in_a_hidden_category_cannot_be_ordered(): void
    {
        [$user, $address] = $this->customerWithAddress();
        $this->signInAs($user);

        Category::whereKey(Product::findOrFail('smoked-salmon')->category_id)->update(['is_active' => false]);

        $this->postJson('/api/orders', $this->orderPayload($address, ['smoked-salmon' => 1]))->assertStatus(422);
    }

    public function test_order_fields_have_a_shape(): void
    {
        [$user, $address] = $this->customerWithAddress();
        $this->signInAs($user);

        $this->postJson('/api/orders', $this->orderPayload($address, ['smoked-salmon' => 1.00001]))
            ->assertStatus(422)->assertJsonValidationErrors('lines.0.qty');

        $this->postJson('/api/orders', $this->orderPayload($address, ['smoked-salmon' => 1]) + ['delivery_slot' => '<b>x</b>'])
            ->assertStatus(422)->assertJsonValidationErrors('delivery_slot');

        $this->postJson('/api/orders', $this->orderPayload($address, ['smoked-salmon' => 1]) + ['delivery_slot' => '14:00–18:00'])
            ->assertCreated();
    }

    public function test_map_links_cannot_climb_out_of_maps(): void
    {
        [$user] = $this->customerWithAddress();
        $this->signInAs($user);

        $body = ['line' => 'Nizami küçəsi 10', 'delivery_zone_id' => self::ZONE];

        foreach ([
            'https://www.google.com/maps/../url?q=https://evil.test',
            'https://www.google.com/maps/%2e%2e/url?q=https://evil.test',
            'https://www.google.com/maps\\..\\url?q=https://evil.test',
        ] as $link) {
            $this->postJson('/api/addresses', $body + ['map_link' => $link])->assertStatus(422);
        }

        $this->postJson('/api/addresses', $body + ['map_link' => 'https://www.google.com/maps?q=40.409264,49.867092'])->assertCreated();
    }

    // ---------------------------------------------------------- sessions ---

    public function test_signing_out_everywhere_stops_notifications_too(): void
    {
        $user = User::factory()->create();
        $user->pushTokens()->create(['token' => 'ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]', 'platform' => 'ios']);
        $this->signInAs($user);

        $this->postJson('/api/auth/logout-all')->assertSuccessful();

        $this->assertSame(0, $user->pushTokens()->count());
    }

    public function test_an_unknown_api_path_answers_like_a_missing_record(): void
    {
        $this->getJson('/api/no-such-thing')->assertNotFound()->assertExactJson(['message' => 'Not found.']);
        $this->putJson('/api/catalogue')->assertNotFound()->assertExactJson(['message' => 'Not found.']);
    }
}
