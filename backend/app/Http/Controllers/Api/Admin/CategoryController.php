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
            'data' => $categories->map(fn (Category $c) => [
                'id' => $c->id,
                'is_active' => $c->is_active,
                'sort' => $c->sort,
                'name' => $c->translationMap('name'),
                'product_count' => (int) ($counts[$c->id] ?? 0),
            ]),
        ]);
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
