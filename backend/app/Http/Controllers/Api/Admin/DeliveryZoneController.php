<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\DeliveryZone;
use App\Models\DeliveryZoneTranslation;
use App\Support\Audit;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

/**
 * Where the shop delivers, and what it charges to get there.
 *
 * The zones ship seeded with a zero fee and no minimum, because nobody had
 * decided those numbers yet. This is where they get decided — and the quote
 * endpoint reads the same rows, so a fee set here is charged on the next
 * basket without a deploy.
 */
class DeliveryZoneController extends Controller
{
    private const LOCALES = ['az', 'en', 'ru'];

    public function index(): JsonResponse
    {
        $zones = DeliveryZone::with('translations')->orderBy('sort')->get();

        return response()->json([
            'data' => $zones->map(fn (DeliveryZone $z) => [
                'id' => $z->id,
                'fee_minor' => $z->fee_minor,
                'min_order_minor' => $z->min_order_minor,
                'is_active' => $z->is_active,
                'sort' => $z->sort,
                'name' => $z->translationMap('name'),
            ]),
        ]);
    }

    public function update(Request $request, string $id): JsonResponse
    {
        $data = $request->validate([
            'fee_minor' => ['sometimes', 'integer', 'min:0', 'max:100000'],
            'min_order_minor' => ['sometimes', 'integer', 'min:0', 'max:10000000'],
            'is_active' => ['sometimes', 'boolean'],
            'sort' => ['sometimes', 'integer', 'min:0', 'max:9999'],
            'translations' => ['sometimes', 'array'],
            'translations.*.name' => ['sometimes', 'nullable', 'string', 'max:80'],
        ]);

        $zone = DeliveryZone::with('translations')->findOrFail($id);

        $changes = DB::transaction(function () use ($zone, $data) {
            $zone->fill(collect($data)->only(['fee_minor', 'min_order_minor', 'is_active', 'sort'])->all());
            $changes = Audit::diff($zone, ['fee_minor', 'min_order_minor', 'is_active', 'sort']);
            $zone->save();

            foreach ($data['translations'] ?? [] as $locale => $fields) {
                if (! in_array($locale, self::LOCALES, true) || blank($fields['name'] ?? null)) {
                    continue;
                }

                $row = DeliveryZoneTranslation::firstOrNew(['delivery_zone_id' => $zone->id, 'locale' => $locale]);
                $row->name = $fields['name'];

                if ($row->isDirty()) {
                    $changes["name:{$locale}"] = ['from' => $row->getOriginal('name'), 'to' => $row->name];
                    $row->save();
                }
            }

            return $changes;
        });

        if ($changes !== []) {
            Audit::record($request->user(), 'zone.update', 'zone', $zone->id, $changes);
        }

        return response()->json(['status' => 'ok']);
    }
}
