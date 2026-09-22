<?php

namespace Database\Seeders;

use App\Models\DeliveryZone;
use Illuminate\Database\Seeder;
use RuntimeException;

/**
 * Delivery zones, from shared/delivery.json.
 *
 * That file is the one written copy of the shop's fifty-one areas: the
 * website's basket reads it, the app's checkout reads it, and it seeds this
 * table, so an area added once is offered everywhere.
 *
 * WHAT THIS LOSES. A `fee` there is a pair — `[20, 25]` for Şüvəlan, because
 * the distance inside the area varies enough that the shop will not commit to
 * one figure until it knows the address. This table holds ONE integer, so the
 * LOW end is what lands here, and both surfaces show the range from the shared
 * file rather than from the API. Quoting a customer the low end of a range as
 * though it were the price is the failure this comment exists to prevent; that
 * is also why delivery is a line of its own on an order rather than folded
 * into the total.
 *
 * Idempotent: re-run it after editing the JSON and the fees update in place.
 * A fee the admin panel has since changed is overwritten, which is the right
 * way round — the JSON is the reviewable record of what the shop agreed.
 */
class DeliveryZoneSeeder extends Seeder
{
    public function run(): void
    {
        $path = base_path('../shared/delivery.json');

        if (! is_file($path)) {
            throw new RuntimeException("Delivery zones missing at {$path}. Run `npm run sync` at the repository root.");
        }

        $zones = json_decode((string) file_get_contents($path), true, 512, JSON_THROW_ON_ERROR)['zones'] ?? [];

        if ($zones === []) {
            throw new RuntimeException('shared/delivery.json lists no areas.');
        }

        $sort = 0;
        $ranges = 0;

        foreach ($zones as $row) {
            $sort += 10;
            [$low, $high] = $row['fee'];
            if ($low !== $high) {
                $ranges++;
            }

            $zone = DeliveryZone::updateOrCreate(
                ['id' => $row['id']],
                [
                    'fee_minor' => (int) round($low * 100),
                    'min_order_minor' => 0,
                    'is_active' => true,
                    'sort' => $sort,
                ],
            );

            foreach (['az', 'ru', 'en'] as $locale) {
                $zone->translations()->updateOrCreate(['locale' => $locale], ['name' => $row[$locale]]);
            }
        }

        /* An area the shop has dropped — or a placeholder from before it
           supplied its list — is switched off rather than deleted: an order
           taken last week still points at it, and a deleted row would take
           that history with it. */
        $retired = DeliveryZone::whereNotIn('id', array_column($zones, 'id'))
            ->where('is_active', true)
            ->update(['is_active' => false]);

        if ($retired > 0) {
            $this->command?->warn("{$retired} delivery area(s) not in shared/delivery.json switched off.");
        }

        $this->command?->info(sprintf(
            'Delivery zones: %d areas seeded. %d of them are quoted as a range; '.
            'the API carries the low end and the shared file carries the range.',
            count($zones),
            $ranges,
        ));
    }
}
