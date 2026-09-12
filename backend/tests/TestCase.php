<?php

namespace Tests;

use App\Models\Address;
use App\Models\User;
use Database\Seeders\CatalogueSeeder;
use Database\Seeders\DeliveryZoneSeeder;
use Illuminate\Foundation\Testing\TestCase as BaseTestCase;

abstract class TestCase extends BaseTestCase
{
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

    protected function customerWithAddress(array $attributes = []): array
    {
        $user = User::factory()->create($attributes);

        $address = $user->addresses()->create([
            'line' => '28 May küçəsi 14, mənzil 7',
            'notes' => 'Second floor',
            'delivery_zone_id' => 'baku-city',
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
