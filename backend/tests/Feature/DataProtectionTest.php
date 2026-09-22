<?php

namespace Tests\Feature;

use App\Models\Address;
use App\Models\Order;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/**
 * What a stolen copy of the database is worth.
 *
 * The answer these tests hold the system to: a list of opaque blobs. Names,
 * addresses, phone numbers and email addresses must not be readable without
 * the application's keys, which do not live in the database.
 */
class DataProtectionTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seedCatalogue();
    }

    public function test_personal_data_is_unreadable_in_the_users_table(): void
    {
        $user = User::factory()->create([
            'email' => 'leyla@example.com',
            'name' => 'Leyla Əliyeva',
            'phone' => '+994501234567',
        ]);

        $raw = DB::table('users')->where('id', $user->id)->first();

        foreach (['leyla@example.com', 'Leyla Əliyeva', '+994501234567'] as $secret) {
            $this->assertStringNotContainsString($secret, $raw->email ?? '');
            $this->assertStringNotContainsString($secret, $raw->name ?? '');
            $this->assertStringNotContainsString($secret, $raw->phone ?? '');
        }

        // And it still round-trips for the application.
        $this->assertSame('Leyla Əliyeva', $user->fresh()->name);
    }

    public function test_addresses_are_unreadable_in_the_database(): void
    {
        [$user, $address] = $this->customerWithAddress();

        $raw = DB::table('addresses')->where('id', $address->id)->first();

        $this->assertStringNotContainsString('28 May', $raw->line);
        $this->assertStringNotContainsString('Second floor', (string) $raw->notes);

        // The zone stays in the clear: the delivery fee is computed from it.
        $this->assertSame(self::ZONE, $raw->delivery_zone_id);
    }

    public function test_a_map_link_has_to_be_a_google_maps_link(): void
    {
        [$user] = $this->customerWithAddress();
        Sanctum::actingAs($user);

        $body = [
            'line' => 'Nizami küçəsi 22, mənzil 3',
            'delivery_zone_id' => self::ZONE,
        ];

        /* Staff open this link out of the admin panel, so a customer who can
           store any URL can deliver a phishing link to the shop. Only Google's
           own map hosts are accepted, over https. */
        foreach ([
            'https://evil.example.com/maps',
            'http://maps.google.com/?q=1,2',          // not https
            'javascript:alert(1)',
            'https://google.com.evil.test/maps',
            'https://notgoogle.az/maps',
        ] as $bad) {
            $this->postJson('/api/addresses', $body + ['map_link' => $bad])
                ->assertStatus(422);
        }

        foreach ([
            'https://maps.app.goo.gl/AbCdEfGhIjK',
            'https://www.google.com/maps/@40.3777,49.8920,17z',
            'https://google.az/maps/place/Freshness',
        ] as $good) {
            $this->postJson('/api/addresses', $body + ['map_link' => $good])
                ->assertCreated()
                ->assertJsonPath('map_link', $good);
        }
    }

    public function test_a_map_link_is_unreadable_in_the_database(): void
    {
        [$user] = $this->customerWithAddress();
        Sanctum::actingAs($user);

        $link = 'https://maps.app.goo.gl/SecretDoorstep';

        $id = $this->postJson('/api/addresses', [
            'line' => 'Nizami küçəsi 22, mənzil 3',
            'delivery_zone_id' => self::ZONE,
            'map_link' => $link,
        ])->assertCreated()->json('id');

        $raw = DB::table('addresses')->where('id', $id)->first();

        // A link that resolves to a doorstep identifies a household as
        // precisely as the street line does, so it is encrypted with it.
        $this->assertStringNotContainsString('SecretDoorstep', (string) $raw->map_link);
    }

    public function test_the_map_link_reaches_the_order_and_is_encrypted_there(): void
    {
        [$user] = $this->customerWithAddress();
        Sanctum::actingAs($user);

        $link = 'https://maps.app.goo.gl/CourierNeedsThis';

        $id = $this->postJson('/api/addresses', [
            'line' => 'Nizami küçəsi 22, mənzil 3',
            'delivery_zone_id' => self::ZONE,
            'map_link' => $link,
            'is_default' => true,
        ])->assertCreated()->json('id');

        $address = Address::findOrFail($id);

        // Snapshotted onto the order: a link kept only on the saved address is
        // no use to the courier holding the order, and editing that address
        // later must not rewrite where this delivery went.
        $this->postJson('/api/orders', $this->orderPayload($address, ['smoked-salmon' => 1]))
            ->assertCreated()
            ->assertJsonPath('address_map_link', $link);

        $raw = DB::table('orders')->first();
        $this->assertStringNotContainsString('CourierNeedsThis', (string) $raw->address_map_link);
    }

    public function test_the_address_snapshot_on_an_order_is_also_encrypted(): void
    {
        [$user, $address] = $this->customerWithAddress();
        Sanctum::actingAs($user);

        $this->postJson('/api/orders', $this->orderPayload($address, ['smoked-salmon' => 1]))->assertCreated();

        $raw = DB::table('orders')->first();

        $this->assertStringNotContainsString('28 May', (string) $raw->address_line);
        $this->assertStringNotContainsString($user->phone, (string) $raw->contact_phone);
    }

    public function test_the_api_never_returns_a_lookup_hash_or_a_role(): void
    {
        $user = User::factory()->create();
        Sanctum::actingAs($user);

        $body = $this->getJson('/api/me')->assertOk()->json('data');

        $this->assertArrayNotHasKey('email_hash', $body);
        $this->assertArrayNotHasKey('phone_hash', $body);
        $this->assertArrayNotHasKey('role', $body);
        $this->assertArrayNotHasKey('blocked_at', $body);
    }

    public function test_deleting_an_account_destroys_the_personal_data(): void
    {
        [$user, $address] = $this->customerWithAddress(['name' => 'Rəşad', 'email' => 'rashad@example.com']);
        Sanctum::actingAs($user);

        $this->postJson('/api/orders', $this->orderPayload($address, ['smoked-salmon' => 1]))->assertCreated();

        // Close the order out so deletion is allowed.
        Order::first()->forceFill(['status' => 'delivered', 'delivered_at' => now()])->save();

        $this->deleteJson('/api/me')->assertOk();

        $fresh = $user->fresh();
        $this->assertNull($fresh->email);
        $this->assertNull($fresh->name);
        $this->assertNull($fresh->phone);
        $this->assertNotNull($fresh->anonymised_at);

        // Addresses gone, tokens gone, order stripped of the person.
        $this->assertSame(0, DB::table('addresses')->count());
        $this->assertSame(0, DB::table('personal_access_tokens')->count());
        $this->assertNull(Order::first()->address_line);
        $this->assertNull(Order::first()->contact_name);
    }

    public function test_deleting_an_account_keeps_the_financial_record(): void
    {
        [$user, $address] = $this->customerWithAddress();
        Sanctum::actingAs($user);

        $this->postJson('/api/orders', $this->orderPayload($address, ['smoked-salmon' => 1]))->assertCreated();
        $total = Order::first()->total_minor;
        Order::first()->forceFill(['status' => 'delivered'])->save();

        $this->deleteJson('/api/me')->assertOk();

        // The shop still has to be able to account for what it sold.
        $this->assertSame(1, Order::count());
        $this->assertSame($total, Order::first()->total_minor);
        $this->assertSame(1, Order::first()->items()->count());
    }

    public function test_an_account_with_an_order_in_flight_cannot_be_deleted(): void
    {
        [$user, $address] = $this->customerWithAddress();
        Sanctum::actingAs($user);

        $this->postJson('/api/orders', $this->orderPayload($address, ['smoked-salmon' => 1]))->assertCreated();

        // Someone is about to knock on a door with goods.
        $this->deleteJson('/api/me')->assertStatus(409);

        $this->assertNotNull($user->fresh()->email);
    }

    public function test_a_deleted_account_cannot_sign_back_in_with_its_old_token(): void
    {
        $user = User::factory()->create();
        Sanctum::actingAs($user);
        $user->anonymise();

        $this->getJson('/api/me')->assertStatus(401);
    }

    public function test_security_headers_are_present_on_every_response(): void
    {
        $this->getJson('/api/catalogue')
            ->assertOk()
            ->assertHeader('X-Content-Type-Options', 'nosniff')
            ->assertHeader('X-Frame-Options', 'DENY')
            ->assertHeader('Referrer-Policy', 'no-referrer');
    }
}
