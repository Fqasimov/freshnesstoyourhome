<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Category;
use App\Models\Collection;
use App\Models\CollectionItem;
use App\Models\CollectionTranslation;
use App\Support\Audit;
use App\Support\PageContent;
use App\Support\Slug;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

/**
 * Collection pages: a page the shop puts together from chosen products and
 * sets, with its own text — /kataloq/yeni-il-setleri for the New Year, say.
 * They live beside the categories under /kataloq/, so a slug may belong to
 * one or the other, never both.
 */
class CollectionController extends Controller
{
    private const LOCALES = ['az', 'en', 'ru'];

    public function index(): JsonResponse
    {
        return response()->json([
            'data' => Collection::with(['translations', 'items'])->orderBy('sort')->orderBy('id')->get()
                ->map(fn (Collection $c) => $this->shape($c))->values(),
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $this->validated($request, null);

        $collection = DB::transaction(function () use ($data) {
            $c = Collection::create([
                'slug' => $data['slug'],
                'is_active' => $data['is_active'] ?? true,
                'is_indexed' => $data['is_indexed'] ?? true,
                'sort' => ((int) Collection::max('sort')) + 1,
            ]);
            $this->write($c, $data);

            return $c;
        });

        Audit::record($request->user(), 'collection.create', 'collection', (string) $collection->id, [
            'slug' => ['from' => null, 'to' => $collection->slug],
        ]);

        return response()->json($this->shape($collection->fresh(['translations', 'items'])), 201);
    }

    public function update(Request $request, int $id): JsonResponse
    {
        $collection = Collection::findOrFail($id);
        $data = $this->validated($request, $collection);

        DB::transaction(function () use ($collection, $data) {
            $collection->fill(collect($data)->only(['slug', 'is_active', 'is_indexed', 'sort'])->all())->save();
            $collection->touch();
            $this->write($collection, $data);
        });

        Audit::record($request->user(), 'collection.update', 'collection', (string) $collection->id, [
            'slug' => ['from' => $collection->getOriginal('slug'), 'to' => $collection->slug],
        ]);

        return response()->json($this->shape($collection->fresh(['translations', 'items'])));
    }

    public function destroy(Request $request, int $id): JsonResponse
    {
        $collection = Collection::findOrFail($id);
        $collection->delete();
        Audit::record($request->user(), 'collection.delete', 'collection', (string) $id, [
            'slug' => ['from' => $collection->slug, 'to' => null],
        ]);

        return response()->json(['status' => 'ok']);
    }

    private function validated(Request $request, ?Collection $existing): array
    {
        $creating = $existing === null;
        $data = $request->validate([
            'slug' => [$creating ? 'required' : 'sometimes', 'string', 'min:3', 'max:'.Slug::MAX, 'regex:'.Slug::PATTERN,
                Rule::unique('collections', 'slug')->ignore($existing?->id)],
            'is_active' => ['sometimes', 'boolean'],
            'is_indexed' => ['sometimes', 'boolean'],
            'sort' => ['sometimes', 'integer', 'min:0', 'max:9999'],
            'translations' => [$creating ? 'required' : 'sometimes', 'array'],
            'translations.az.name' => [$creating ? 'required' : 'sometimes', 'string', 'max:120'],
            'translations.*.name' => ['sometimes', 'nullable', 'string', 'max:120'],
            ...PageContent::rules(),
            'products' => ['sometimes', 'array', 'max:200'],
            'products.*' => ['string', 'distinct', Rule::exists('products', 'id')],
            'bundles' => ['sometimes', 'array', 'max:50'],
            'bundles.*' => ['string', 'distinct', Rule::exists('bundles', 'id')],
        ]);

        if (isset($data['slug']) && Category::where('slug', $data['slug'])->exists()) {
            throw ValidationException::withMessages(['slug' => 'Bu ünvan artıq bir kateqoriyanındır.']);
        }

        return $data;
    }

    private function write(Collection $c, array $data): void
    {
        foreach ($data['translations'] ?? [] as $locale => $fields) {
            if (! in_array($locale, self::LOCALES, true)) {
                continue;
            }
            $row = CollectionTranslation::firstOrNew(['collection_id' => $c->id, 'locale' => $locale]);
            if (filled($fields['name'] ?? null)) {
                $row->name = $fields['name'];
            } elseif (! $row->exists) {
                if ($locale === 'az') {
                    continue;
                }
                $row->name = $c->translations()->where('locale', 'az')->value('name') ?? $c->slug;
            }
            PageContent::fill($row, $fields);
            $row->save();
        }

        // The lists are sent whole: what is sent is what the page shows, in that order.
        foreach ([CollectionItem::PRODUCT => 'products', CollectionItem::BUNDLE => 'bundles'] as $type => $key) {
            if (! array_key_exists($key, $data)) {
                continue;
            }
            CollectionItem::where('collection_id', $c->id)->where('item_type', $type)->delete();
            foreach (array_values($data[$key]) as $i => $itemId) {
                CollectionItem::create(['collection_id' => $c->id, 'item_type' => $type, 'item_id' => $itemId, 'sort' => $i]);
            }
        }
    }

    private function shape(Collection $c): array
    {
        return [
            'id' => $c->id,
            'slug' => $c->slug,
            'is_active' => $c->is_active,
            'is_indexed' => $c->is_indexed,
            'sort' => $c->sort,
            'name' => $c->translationMap('name'),
            ...PageContent::shape($c),
            'products' => $c->items->where('item_type', CollectionItem::PRODUCT)->pluck('item_id')->values(),
            'bundles' => $c->items->where('item_type', CollectionItem::BUNDLE)->pluck('item_id')->values(),
        ];
    }
}
