<?php

namespace Database\Seeders;

use App\Models\DeliveryZone;
use Illuminate\Database\Seeder;

/**
 * Delivery zones.
 *
 * The business has not yet supplied its areas and prices, so these two zones
 * carry a zero fee and no minimum. That is a placeholder, and a zero fee is a
 * real decision the moment an order is taken — set the real numbers before
 * launch:
 *
 *   php artisan freshness:zone baku-city --fee=3.00 --min=30.00
 *
 * The structure is here so nothing has to be rebuilt when the numbers arrive;
 * only the values change.
 */
class DeliveryZoneSeeder extends Seeder
{
    private const ZONES = [
        [
            'id' => 'baku-city',
            'sort' => 10,
            'names' => ['az' => 'Bakı şəhəri', 'ru' => 'Город Баку', 'en' => 'Baku city'],
        ],
        [
            'id' => 'baku-around',
            'sort' => 20,
            'names' => ['az' => 'Bakı ətrafı', 'ru' => 'Пригород Баку', 'en' => 'Around Baku'],
        ],
    ];

    public function run(): void
    {
        foreach (self::ZONES as $row) {
            $zone = DeliveryZone::updateOrCreate(
                ['id' => $row['id']],
                ['fee_minor' => 0, 'min_order_minor' => 0, 'is_active' => true, 'sort' => $row['sort']],
            );

            foreach ($row['names'] as $locale => $name) {
                $zone->translations()->updateOrCreate(['locale' => $locale], ['name' => $name]);
            }
        }

        $this->command?->warn(
            'Delivery zones seeded with a ZERO fee and no minimum order — '.
            'placeholders. Set the real values before taking orders.'
        );
    }
}
