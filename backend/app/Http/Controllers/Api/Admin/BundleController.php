<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Bundle;
use App\Models\BundleItem;
use App\Models\BundleTranslation;
use App\Models\Product;
use App\Support\Audit;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

/**
 * Aksiyalar — the discounted sets.
 *
 * Every set ships inactive until somebody here turns it on, which is the whole
 * reason this screen exists: the sets and their discounts were invented during
 * design, and an invented discount that reaches a customer is a promise the
 * shop did not make.
 */
class BundleController extends Controller
{
    private const LOCALES = ['az', 'en', 'ru'];

    public function index(): JsonResponse
    {
        $bundles = Bundle::with(['translations', 'items.product.translations'])
            ->orderBy('sort')
            ->get();

        return response()->json(['data' => $bundles->map(fn (Bundle $b) => $this->shape($b))]);
    }

    public function update(Request $request, string $id): JsonResponse
    {
        $data = $request->validate([
            // Capped well below 100: a bundle that costs nothing is a bug
            // being typed, not a promotion being run.
            'discount_percent' => ['sometimes', 'integer', 'min:0', 'max:60'],
            'is_active' => ['sometimes', 'boolean'],
            'sort' => ['sometimes', 'integer', 'min:0', 'max:9999'],

            'items' => ['sometimes', 'array', 'min:1', 'max:12'],
            'items.*.product_id' => ['required', 'string', 'exists:products,id'],
            'items.*.qty' => ['required', 'numeric', 'min:0.001', 'max:99'],

            'translations' => ['sometimes', 'array'],
            'translations.*.name' => ['sometimes', 'nullable', 'string', 'max:120'],
            'translations.*.description' => ['sometimes', 'nullable', 'string', 'max:600'],
        ]);

        $bundle = Bundle::with(['translations', 'items'])->findOrFail($id);

        $changes = DB::transaction(function () use ($bundle, $data) {
            $bundle->fill(collect($data)->only(['discount_percent', 'is_active', 'sort'])->all());
            $changes = Audit::diff($bundle, ['discount_percent', 'is_active', 'sort']);
            $bundle->save();

            if (array_key_exists('items', $data)) {
                $before = $bundle->items->map(fn ($i) => $i->product_id.'×'.(float) $i->qty)->sort()->values()->all();

                $bundle->items()->delete();
                foreach ($data['items'] as $item) {
                    BundleItem::create([
                        'bundle_id' => $bundle->id,
                        'product_id' => $item['product_id'],
                        'qty' => $item['qty'],
                    ]);
                }

                $after = collect($data['items'])
                    ->map(fn ($i) => $i['product_id'].'×'.(float) $i['qty'])->sort()->values()->all();

                if ($before !== $after) {
                    $changes['items'] = ['from' => $before, 'to' => $after];
                }
            }

            foreach ($data['translations'] ?? [] as $locale => $fields) {
                if (! in_array($locale, self::LOCALES, true)) {
                    continue;
                }

                $row = BundleTranslation::firstOrNew(['bundle_id' => $bundle->id, 'locale' => $locale]);
                $row->fill(collect($fields)->only(['name', 'description'])->all());

                if (blank($row->name)) {
                    $row->name = $bundle->nameIn($locale);
                }

                if ($row->isDirty()) {
                    $changes["name:{$locale}"] = ['from' => $row->getOriginal('name'), 'to' => $row->name];
                    $row->save();
                }
            }

            return $changes;
        });

        if ($changes !== []) {
            Audit::record($request->user(), 'bundle.update', 'bundle', $bundle->id, $changes);
        }

        return response()->json($this->shape(
            $bundle->fresh(['translations', 'items.product.translations'])
        ));
    }

    /**
     * @return array<string, mixed>
     */
    private function shape(Bundle $b): array
    {
        $items = $b->items->map(fn (BundleItem $i) => [
            'product_id' => $i->product_id,
            'qty' => (float) $i->qty,
            'name' => $i->product?->translationMap('name'),
            'price_minor' => $i->product?->price_minor,
            'orderable' => (bool) ($i->product?->is_active && $i->product?->in_stock),
        ]);

        // What the set is worth at today's prices, and what it would cost at
        // the discount. Computed here so the panel never has to do money
        // arithmetic of its own — the same rule the website follows.
        $full = $items->sum(fn ($i) => (int) ($i['price_minor'] ?? 0) * $i['qty']);
        $price = (int) round($full * (100 - $b->discount_percent) / 100);

        return [
            'id' => $b->id,
            'discount_percent' => $b->discount_percent,
            'is_active' => $b->is_active,
            'sort' => $b->sort,
            'name' => $b->translationMap('name'),
            'description' => $b->translationMap('description'),
            'items' => $items,
            'full_minor' => (int) $full,
            'price_minor' => $price,
            'saving_minor' => (int) $full - $price,
            // The catalogue endpoint drops a bundle whose products are not all
            // orderable. Saying so here stops the shopkeeper from wondering
            // why the set they just switched on is not on the website.
            'shown_on_site' => $b->is_active
                && $items->isNotEmpty()
                && $items->every(fn ($i) => $i['orderable']),
        ];
    }
}
