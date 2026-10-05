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
 * The zones ship seeded from shared/delivery.json. This is where they get
 * changed, and where a new area is added — and the quote endpoint reads the
 * same rows, so a fee set here is charged on the next basket without a
 * deploy.
 */
class DeliveryZoneController extends Controller
{
    private const LOCALES = ['az', 'en', 'ru'];

    public function index(): JsonResponse
    {
        $zones = DeliveryZone::with('translations')->orderBy('sort')->get();

        return response()->json(['data' => $zones->map(fn (DeliveryZone $z) => $this->shape($z))]);
    }

    /**
     * A new delivery area.
     *
     * Its id is permanent: saved addresses and past orders point at it, so it
     * is a slug chosen once. It is never deleted either — switched off instead
     * — for the same reason.
     */
    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'id' => ['required', 'string', 'min:2', 'max:40', 'regex:/^[a-z0-9]+(-[a-z0-9]+)*$/', 'unique:delivery_zones,id'],
            'fee_minor' => ['required', 'integer', 'min:0', 'max:100000'],
            'min_order_minor' => ['sometimes', 'integer', 'min:0', 'max:10000000'],
            'is_active' => ['sometimes', 'boolean'],
            'translations' => ['required', 'array'],
            'translations.az.name' => ['required', 'string', 'max:80'],
            'translations.*.name' => ['sometimes', 'nullable', 'string', 'max:80'],
        ]);

        $zone = DB::transaction(function () use ($data) {
            $zone = DeliveryZone::create([
                'id' => $data['id'],
                'fee_minor' => $data['fee_minor'],
                'min_order_minor' => $data['min_order_minor'] ?? 0,
                'is_active' => $data['is_active'] ?? true,
                'sort' => (int) DeliveryZone::max('sort') + 1,
            ]);

            foreach ($data['translations'] as $locale => $fields) {
                if (! in_array($locale, self::LOCALES, true) || blank($fields['name'] ?? null)) {
                    continue;
                }

                DeliveryZoneTranslation::create([
                    'delivery_zone_id' => $zone->id,
                    'locale' => $locale,
                    'name' => $fields['name'],
                ]);
            }

            return $zone;
        });

        Audit::record($request->user(), 'zone.create', 'zone', $zone->id, [
            'fee_minor' => ['from' => null, 'to' => $zone->fee_minor],
            'name' => ['from' => null, 'to' => $data['translations']['az']['name']],
        ]);

        return response()->json($this->shape($zone->fresh('translations')), 201);
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

        return response()->json($this->shape($zone->fresh('translations')));
    }

    /** @return array<string, mixed> */
    private function shape(DeliveryZone $z): array
    {
        return [
            'id' => $z->id,
            'fee_minor' => $z->fee_minor,
            'min_order_minor' => $z->min_order_minor,
            'is_active' => $z->is_active,
            'sort' => $z->sort,
            'name' => $z->translationMap('name'),
        ];
    }

    /**
     * Delete a delivery area.
     *
     * Refused while customers have saved addresses in it: deleting the area
     * would delete those addresses with it. Switch it off instead. Past orders
     * keep their address text and simply lose the link to the area.
     */
    public function destroy(Request $request, string $id): JsonResponse
    {
        $zone = DeliveryZone::with('translations')->findOrFail($id);

        if (\App\Models\Address::where('delivery_zone_id', $zone->id)->exists()) {
            return response()->json([
                'message' => 'Bu zonada müştərilərin saxlanmış ünvanları var. Silmək əvəzinə zonanı deaktiv edin.',
            ], 422);
        }

        $name = $zone->nameIn('az');

        DB::transaction(function () use ($zone) {
            DeliveryZoneTranslation::where('delivery_zone_id', $zone->id)->delete();
            $zone->delete();
        });

        Audit::record($request->user(), 'zone.delete', 'zone', $id, ['name' => ['from' => $name, 'to' => null]]);

        return response()->json(['status' => 'ok']);
    }
}
