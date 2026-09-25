<?php

namespace Tests;

use App\Models\Address;
use App\Models\User;
use Database\Seeders\CatalogueSeeder;
use Database\Seeders\DeliveryZoneSeeder;
use Illuminate\Foundation\Testing\TestCase as BaseTestCase;
use Laravel\Sanctum\Sanctum;

abstract class TestCase extends BaseTestCase
{
    /**
     * The zone tests deliver to.
     *
     * A real id out of shared/delivery.json rather than a fixture: the seeder
     * takes its areas from that file, so a test naming an area the shop does
     * not cover would fail on a foreign key rather than on what it set out to
     * check. Mərkəz is the flat-fee city centre, five manats.
     */
    protected const ZONE = 'merkez';

    /**
     * Seed the real catalogue, not a fixture.
     *
     * Tests that price baskets should price the goods the shop actually sells:
     * a made-up product costing exactly 10.00 hides every rounding problem
     * that real prices and fractional kilos produce.
     */
    protected function seedCatalogue(): void
    {
        $this->seed(CatalogueSeeder::class);
        $this->seed(DeliveryZoneSeeder::class);
    }

    /**
     * Act as $user holding the token the real sign-in would have given them.
     *
     * An admin gets what the panel's sign-in issues — an `admin` token, with
     * the address named in ADMIN_EMAILS. Everyone else gets what the shop's
     * sign-in issues. Tests that need a mismatch (an admin holding a shop
     * token, say) call Sanctum::actingAs directly.
     */
    protected function signInAs(User $user): User
    {
        if ($user->isAdmin()) {
            config(['freshness.admin.emails' => [...config('freshness.admin.emails', []), $user->email]]);

            return Sanctum::actingAs($user, ['admin']);
        }

        return Sanctum::actingAs($user, ['customer']);
    }

    protected function customerWithAddress(array $attributes = []): array
    {
        $user = User::factory()->create($attributes);

        $address = $user->addresses()->create([
            'line' => '28 May küçəsi 14, mənzil 7',
            'notes' => 'Second floor',
            'delivery_zone_id' => self::ZONE,
            'is_default' => true,
        ]);

        return [$user, $address];
    }

    /** The first date the shop will accept, given the one-day lead time. */
    protected function deliverableDate(): string
    {
        return now()->addDays((int) config('freshness.order.lead_days') + 1)->toDateString();
    }

    /** @param  array<string, float>  $lines  product id => qty */
    protected function orderPayload(Address $address, array $lines): array
    {
        return [
            'address_id' => $address->id,
            'delivery_date' => $this->deliverableDate(),
            'payment_method' => 'cash',
            'lines' => collect($lines)
                ->map(fn ($qty, $id) => ['product_id' => $id, 'qty' => $qty])
                ->values()
                ->all(),
        ];
    }
}
