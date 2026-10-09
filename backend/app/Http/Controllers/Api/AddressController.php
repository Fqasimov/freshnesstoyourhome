<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Address;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

/**
 * Delivery addresses.
 *
 * Every query is scoped through `$request->user()->addresses()`, never
 * `Address::find()`. That is the whole of the access control: an id belonging
 * to somebody else simply does not exist in this relation, so the failure mode
 * is a 404 rather than a leak. There is no code path here that reaches an
 * address by id alone.
 */
class AddressController extends Controller
{
    /** More than this is not a customer's addresses. */
    private const MAX_PER_USER = 20;

    public function index(Request $request): JsonResponse
    {
        $addresses = $request->user()->addresses()
            ->orderByDesc('is_default')
            ->orderBy('created_at')
            ->get()
            ->map(fn (Address $a) => $this->present($a));

        return response()->json(['data' => $addresses]);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $this->validated($request);

        if ($request->user()->addresses()->count() >= self::MAX_PER_USER) {
            return response()->json(['message' => 'You have saved as many addresses as we keep. Remove one first.'], 422);
        }

        $address = DB::transaction(function () use ($request, $data) {
            $address = $request->user()->addresses()->create($data);

            // The first address a customer saves is their default, and a later
            // one only becomes default if they say so.
            if ($data['is_default'] ?? false) {
                $this->clearOtherDefaults($request, $address->id);
            } elseif ($request->user()->addresses()->count() === 1) {
                $address->forceFill(['is_default' => true])->save();
            }

            return $address;
        });

        return response()->json($this->present($address), 201);
    }

    public function update(Request $request, string $id): JsonResponse
    {
        $address = $request->user()->addresses()->findOrFail($id);
        $data = $this->validated($request);

        DB::transaction(function () use ($request, $address, $data) {
            $address->update($data);

            if ($data['is_default'] ?? false) {
                $this->clearOtherDefaults($request, $address->id);
            }
        });

        return response()->json($this->present($address->fresh()));
    }

    public function destroy(Request $request, string $id): JsonResponse
    {
        $address = $request->user()->addresses()->findOrFail($id);
        $address->delete();

        // Never leave a customer with addresses but no default — the checkout
        // screen would open with nothing selected.
        $remaining = $request->user()->addresses()->orderBy('created_at')->first();
        if ($remaining !== null && ! $request->user()->addresses()->where('is_default', true)->exists()) {
            $remaining->forceFill(['is_default' => true])->save();
        }

        return response()->json(['status' => 'deleted']);
    }

    private function validated(Request $request): array
    {
        return $request->validate([
            'label' => ['sometimes', 'nullable', 'string', 'max:40'],
            'line' => ['required', 'string', 'min:5', 'max:300'],
            'notes' => ['sometimes', 'nullable', 'string', 'max:200'],
            /* A Google Maps link and nothing else. The stored value is shown
               to staff in the admin panel as something clickable, so an
               arbitrary URL here would be a phishing link delivered by the
               customer — the host allow-list is the control, not the `url`
               rule, which is happy with any scheme and any domain. Every
               host ends in `/`, or `maps.app.goo.gl.evil.test` and
               `maps.app.goo.gl@evil.test` would pass as a prefix. */
            'map_link' => [
                'sometimes', 'nullable', 'string', 'max:500',
                'regex:#^https://(maps\.app\.goo\.gl/[A-Za-z0-9_-]+|goo\.gl/maps/[A-Za-z0-9_-]+|(www\.)?google\.(com|az)/maps(/|\?)|maps\.google\.(com|az)/(maps)?(/|\?))#i',
                // A browser resolves `/maps/../url?q=…` to Google's redirector
                // before it fetches anything, which walks straight out of the
                // allow-list above. No dot segments, encoded or not, and no
                // backslashes or spaces, which some browsers read as `/`.
                'not_regex:#(/|%2f)(\.|%2e){1,2}(/|%2f|\?|\#|$)|\\\\|%5c|\s#i',
            ],
            'lat' => ['sometimes', 'nullable', 'numeric', 'between:-90,90'],
            'lng' => ['sometimes', 'nullable', 'numeric', 'between:-180,180'],
            'delivery_zone_id' => [
                'required', 'string',
                Rule::exists('delivery_zones', 'id')->where('is_active', true),
            ],
            'is_default' => ['sometimes', 'boolean'],
        ]);
    }

    private function clearOtherDefaults(Request $request, string $keepId): void
    {
        $request->user()->addresses()
            ->where('id', '!=', $keepId)
            ->update(['is_default' => false]);
    }

    private function present(Address $a): array
    {
        return [
            'id' => $a->id,
            'label' => $a->label,
            'line' => $a->line,
            'notes' => $a->notes,
            'map_link' => $a->map_link,
            'lat' => $a->lat,
            'lng' => $a->lng,
            'delivery_zone_id' => $a->delivery_zone_id,
            'is_default' => $a->is_default,
        ];
    }
}
