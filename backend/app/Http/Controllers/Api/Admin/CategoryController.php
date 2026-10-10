<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Category;
use App\Models\CategoryTranslation;
use App\Models\Product;
use App\Support\Audit;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class CategoryController extends Controller
{
    private const LOCALES = ['az', 'en', 'ru'];

    public function index(): JsonResponse
    {
        $counts = Product::query()
            ->selectRaw('category_id, count(*) as total')
            ->groupBy('category_id')
            ->pluck('total', 'category_id');

        $categories = Category::with('translations')->orderBy('sort')->get();

        return response()->json([
            'data' => $categories->map(fn (Category $c) => $this->shape($c, (int) ($counts[$c->id] ?? 0))),
        ]);
    }

    /**
     * A new category. It appears on the website and in the app as soon as it
     * holds a product; until then the catalogue leaves it out, so an empty
     * shelf is never shown to customers.
     */
    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'id' => ['required', 'string', 'min:2', 'max:40', 'regex:/^[a-z0-9]+(-[a-z0-9]+)*$/', 'unique:categories,id'],
            'translations' => ['required', 'array'],
            'translations.az.name' => ['required', 'string', 'max:80'],
            'translations.*.name' => ['sometimes', 'nullable', 'string', 'max:80'],
        ]);

        $category = DB::transaction(function () use ($data) {
            $category = Category::create([
                'id' => $data['id'],
                'sort' => ((int) Category::max('sort')) + 1,
                'is_active' => true,
            ]);

            foreach ($data['translations'] as $locale => $fields) {
                if (in_array($locale, self::LOCALES, true) && filled($fields['name'] ?? null)) {
                    CategoryTranslation::create([
                        'category_id' => $category->id,
                        'locale' => $locale,
                        'name' => $fields['name'],
                    ]);
                }
            }

            return $category->load('translations');
        });

        Audit::record($request->user(), 'category.create', 'category', $category->id, [
            'name:az' => ['from' => null, 'to' => $data['translations']['az']['name']],
        ]);

        return response()->json($this->shape($category, 0), 201);
    }

    /** Put the categories in the order the shopkeeper chose. */
    public function reorder(Request $request): JsonResponse
    {
        $data = $request->validate([
            'ids' => ['required', 'array', 'min:1', 'max:200'],
            'ids.*' => ['string', 'distinct', 'max:40'],
        ]);

        $rows = Category::all()->keyBy('id');
        $ordered = collect($data['ids'])->filter(fn ($id) => $rows->has($id))->values();
        $rest = $rows->keys()->diff($ordered)->values();

        DB::transaction(function () use ($ordered, $rest, $rows) {
            $ordered->concat($rest)->each(function ($id, $i) use ($rows) {
                if ($rows[$id]->sort !== $i + 1) {
                    $rows[$id]->forceFill(['sort' => $i + 1])->save();
                }
            });
        });

        Audit::record($request->user(), 'category.reorder', 'category', null, [
            'order' => ['from' => null, 'to' => $ordered->all()],
        ]);

        return response()->json(['status' => 'ok']);
    }

    /** Only an empty category can go: products must never be left without one. */
    public function destroy(Request $request, string $id): JsonResponse
    {
        $category = Category::findOrFail($id);

        if (Product::where('category_id', $category->id)->exists()) {
            return response()->json([
                'message' => 'Bu kateqoriyada məhsullar var. Əvvəlcə onları başqa kateqoriyaya keçirin.',
            ], 422);
        }

        DB::transaction(function () use ($category) {
            CategoryTranslation::where('category_id', $category->id)->delete();
            $category->delete();
        });

        Audit::record($request->user(), 'category.delete', 'category', $id);

        return response()->json(['status' => 'ok']);
    }

    private function shape(Category $c, int $count): array
    {
        return [
            'id' => $c->id,
            'is_active' => $c->is_active,
            'sort' => $c->sort,
            'name' => $c->translationMap('name'),
            'product_count' => $count,
        ];
    }

    public function update(Request $request, string $id): JsonResponse
    {
        $data = $request->validate([
            'is_active' => ['sometimes', 'boolean'],
            'sort' => ['sometimes', 'integer', 'min:0', 'max:9999'],
            'translations' => ['sometimes', 'array'],
            'translations.*.name' => ['sometimes', 'nullable', 'string', 'max:80'],
        ]);

        $category = Category::with('translations')->findOrFail($id);

        $changes = DB::transaction(function () use ($category, $data) {
            $category->fill(collect($data)->only(['is_active', 'sort'])->all());
            $changes = Audit::diff($category, ['is_active', 'sort']);
            $category->save();

            foreach ($data['translations'] ?? [] as $locale => $fields) {
                if (! in_array($locale, self::LOCALES, true) || blank($fields['name'] ?? null)) {
                    continue;
                }

                $row = CategoryTranslation::firstOrNew(['category_id' => $category->id, 'locale' => $locale]);
                $row->name = $fields['name'];

                if ($row->isDirty()) {
                    $changes["name:{$locale}"] = ['from' => $row->getOriginal('name'), 'to' => $row->name];
                    $row->save();
                }
            }

            return $changes;
        });

        if ($changes !== []) {
            Audit::record($request->user(), 'category.update', 'category', $category->id, $changes);
        }

        return response()->json(['status' => 'ok']);
    }
}
