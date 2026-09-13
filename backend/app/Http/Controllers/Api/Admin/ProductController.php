<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Product;
use App\Models\ProductTranslation;
use App\Support\Audit;
use App\Support\ProductImage;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule as ValidationRule;
use Illuminate\Validation\ValidationException;
use RuntimeException;
use Illuminate\Validation\Rule;

/**
 * The price list, as the shop sees it.
 *
 * The customer-facing catalogue hides anything inactive or out of stock; this
 * shows everything, because the row you most need to edit is the one nobody
 * can currently buy.
 */
class ProductController extends Controller
{
    private const LOCALES = ['az', 'en', 'ru'];

    /** Fields whose changes are worth a line in the audit trail. */
    private const AUDITED = [
        'price_minor', 'in_stock', 'is_active', 'is_popular', 'category_id', 'sort',
    ];

    public function index(Request $request): JsonResponse
    {
        $filters = $request->validate([
            'search' => ['sometimes', 'nullable', 'string', 'max:60'],
            'category_id' => ['sometimes', 'nullable', 'string', 'max:40'],
        ]);

        $products = Product::with(['translations', 'category.translations'])
            ->when($filters['category_id'] ?? null, fn ($q, $id) => $q->where('category_id', $id))
            ->orderBy('category_id')
            ->orderBy('sort')
            ->get();

        // Searched in PHP rather than SQL on purpose: the whole catalogue is a
        // few dozen rows, and matching across three translation rows per
        // product in SQL costs a join and a LIKE per locale to answer a
        // question the collection answers exactly.
        if ($search = trim((string) ($filters['search'] ?? ''))) {
            $needle = mb_strtolower($search);
            $products = $products->filter(function (Product $p) use ($needle) {
                $haystack = mb_strtolower($p->id.' '.implode(' ', $p->translationMap('name')));

                return str_contains($haystack, $needle);
            });
        }

        return response()->json([
            'data' => $products->map(fn (Product $p) => $this->shape($p))->values(),
        ]);
    }

    /**
     * Add a product.
     *
     * The id is a slug the shopkeeper chooses and can never change afterwards:
     * it is the key on every order line ever written, and it is how the
     * website and the app find the picture in their own bundles. So it is
     * validated hard here and nowhere else accepts it.
     */
    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'id' => [
                'required', 'string', 'min:3', 'max:60',
                // Lower case, digits and single hyphens. Anything else ends up
                // in a URL, a filename and a JSON key.
                'regex:/^[a-z0-9]+(-[a-z0-9]+)*$/',
                ValidationRule::unique('products', 'id'),
            ],
            'category_id' => ['required', 'string', ValidationRule::exists('categories', 'id')],
            'price_minor' => ['required', 'integer', 'min:1', 'max:10000000'],
            'unit_kind' => ['required', ValidationRule::in([Product::UNIT_KG, Product::UNIT_PIECE])],
            'unit_qty' => ['sometimes', 'numeric', 'min:0.001', 'max:9999'],
            'is_popular' => ['sometimes', 'boolean'],
            'is_active' => ['sometimes', 'boolean'],
            'in_stock' => ['sometimes', 'boolean'],

            // Azerbaijani is the source of truth, so that one is required and
            // the other two are not: a product with no name in any language is
            // unsellable, and one named only in Azerbaijani is merely
            // untranslated.
            'translations' => ['required', 'array'],
            'translations.az.name' => ['required', 'string', 'max:120'],
            'translations.*.name' => ['sometimes', 'nullable', 'string', 'max:120'],
            'translations.*.description' => ['sometimes', 'nullable', 'string', 'max:600'],
            'translations.*.unit_label' => ['sometimes', 'nullable', 'string', 'max:40'],
        ]);

        $product = DB::transaction(function () use ($data) {
            $product = Product::create([
                'id' => $data['id'],
                'category_id' => $data['category_id'],
                'price_minor' => $data['price_minor'],
                'currency' => config('freshness.currency'),
                'unit_kind' => $data['unit_kind'],
                'unit_qty' => $data['unit_qty'] ?? 1,
                'is_popular' => $data['is_popular'] ?? false,
                'is_active' => $data['is_active'] ?? true,
                'in_stock' => $data['in_stock'] ?? true,
                // No bundled picture exists for something created today, so
                // this stays null and the photograph comes from an upload.
                'image_path' => null,
                'sort' => (int) Product::where('category_id', $data['category_id'])->max('sort') + 1,
            ]);

            foreach ($data['translations'] as $locale => $fields) {
                if (! in_array($locale, self::LOCALES, true) || blank($fields['name'] ?? null)) {
                    continue;
                }

                ProductTranslation::create([
                    'product_id' => $product->id,
                    'locale' => $locale,
                    'name' => $fields['name'],
                    'description' => $fields['description'] ?? null,
                    'unit_label' => $fields['unit_label'] ?? null,
                ]);
            }

            return $product;
        });

        Audit::record($request->user(), 'product.create', 'product', $product->id, [
            'price_minor' => ['from' => null, 'to' => $product->price_minor],
            'name' => ['from' => null, 'to' => $data['translations']['az']['name']],
        ]);

        return response()->json(
            $this->shape($product->fresh(['translations', 'category.translations'])),
            201,
        );
    }

    /**
     * Attach a photograph, or replace the one that is there.
     *
     * Nothing the client sent is stored: the file is decoded and re-encoded
     * (see ProductImage), so what lands on disk is bytes this server wrote.
     */
    public function photo(Request $request, string $id): JsonResponse
    {
        $request->validate([
            // Two checks that look alike and are not. `image` and `mimes` ask
            // what the bytes are; `max` is in kilobytes and is the only thing
            // standing between the shop and a full disk.
            'photo' => ['required', 'file', 'image', 'mimes:jpeg,jpg,png,webp', 'max:8192'],
        ], [
            // The panel is in Azerbaijani and so is the person using it. A
            // framework default in English is the one string that would give
            // that away, and it appears exactly when somebody has made a
            // mistake and needs to understand what it was.
            'photo.required' => 'Şəkil seçilməyib.',
            'photo.image' => 'Bu fayl şəkil deyil. JPEG, PNG və ya WebP seçin.',
            'photo.mimes' => 'Yalnız JPEG, PNG və ya WebP qəbul olunur.',
            'photo.max' => 'Şəkil 8 MB-dan böyük olmamalıdır.',
        ]);

        $product = Product::with(['translations', 'category.translations'])->findOrFail($id);
        $was = $product->image_file;

        try {
            $stored = ProductImage::store($request->file('photo'));
        } catch (RuntimeException $e) {
            throw ValidationException::withMessages(['photo' => $e->getMessage()]);
        }

        $product->forceFill([
            'image_file' => $stored,
            'image_uploaded_at' => now(),
        ])->save();

        // Only after the new one is safely written, so a failed upload leaves
        // the old photograph in place rather than none at all.
        ProductImage::forget($was);

        Audit::record($request->user(), 'product.photo', 'product', $product->id, [
            'image_file' => ['from' => $was, 'to' => $stored],
        ]);

        return response()->json($this->shape($product->fresh(['translations', 'category.translations'])));
    }

    /** Take the photograph off; the bundled picture, if any, comes back. */
    public function removePhoto(Request $request, string $id): JsonResponse
    {
        $product = Product::with(['translations', 'category.translations'])->findOrFail($id);
        $was = $product->image_file;

        if ($was === null) {
            return response()->json($this->shape($product));
        }

        $product->forceFill(['image_file' => null, 'image_uploaded_at' => null])->save();
        ProductImage::forget($was);

        Audit::record($request->user(), 'product.photo.remove', 'product', $product->id, [
            'image_file' => ['from' => $was, 'to' => null],
        ]);

        return response()->json($this->shape($product->fresh(['translations', 'category.translations'])));
    }

    public function update(Request $request, string $id): JsonResponse
    {
        $data = $request->validate([
            // An upper bound, because a typo in this box is a real risk and
            // 100,000 AZN is not a price anyone means to type.
            'price_minor' => ['sometimes', 'integer', 'min:1', 'max:10000000'],
            'in_stock' => ['sometimes', 'boolean'],
            'is_active' => ['sometimes', 'boolean'],
            'is_popular' => ['sometimes', 'boolean'],
            'sort' => ['sometimes', 'integer', 'min:0', 'max:9999'],
            'category_id' => ['sometimes', 'string', Rule::exists('categories', 'id')],

            'translations' => ['sometimes', 'array'],
            'translations.*.name' => ['sometimes', 'nullable', 'string', 'max:120'],
            'translations.*.description' => ['sometimes', 'nullable', 'string', 'max:600'],
            'translations.*.unit_label' => ['sometimes', 'nullable', 'string', 'max:40'],
        ]);

        $product = Product::with('translations')->findOrFail($id);

        $changes = DB::transaction(function () use ($product, $data) {
            $product->fill(collect($data)->except('translations')->all());
            $changes = Audit::diff($product, self::AUDITED);
            $product->save();

            foreach ($data['translations'] ?? [] as $locale => $fields) {
                if (! in_array($locale, self::LOCALES, true)) {
                    continue;
                }

                $row = ProductTranslation::firstOrNew([
                    'product_id' => $product->id,
                    'locale' => $locale,
                ]);
                $row->fill(array_filter(
                    $fields,
                    fn ($v, $k) => in_array($k, ['name', 'description', 'unit_label'], true),
                    ARRAY_FILTER_USE_BOTH,
                ));

                // A product with no name in any language is unsellable, so an
                // empty name is treated as "leave it alone" rather than obeyed.
                if (blank($row->name)) {
                    $row->name = $product->nameIn($locale);
                }

                if ($row->isDirty()) {
                    $changes["name:{$locale}"] = ['from' => $row->getOriginal('name'), 'to' => $row->name];
                    $row->save();
                }
            }

            return $changes;
        });

        if ($changes !== []) {
            Audit::record($request->user(), 'product.update', 'product', $product->id, $changes);
        }

        return response()->json($this->shape($product->fresh(['translations', 'category.translations'])));
    }

    /**
     * Take a shelf in or out in one go.
     *
     * The morning job is "the mussels and the langoustine did not arrive", and
     * doing that one PATCH at a time is how half of it gets forgotten.
     */
    public function stock(Request $request): JsonResponse
    {
        $data = $request->validate([
            'ids' => ['required', 'array', 'min:1', 'max:200'],
            'ids.*' => ['string', 'max:60'],
            'in_stock' => ['required', 'boolean'],
        ]);

        $products = Product::whereIn('id', $data['ids'])->get();

        $touched = $products
            ->filter(fn (Product $p) => $p->in_stock !== $data['in_stock'])
            ->each(fn (Product $p) => $p->forceFill(['in_stock' => $data['in_stock']])->save())
            ->pluck('id')
            ->all();

        if ($touched !== []) {
            Audit::record($request->user(), 'product.stock', 'product', null, [
                'in_stock' => ['from' => ! $data['in_stock'], 'to' => $data['in_stock']],
                'ids' => ['from' => null, 'to' => $touched],
            ]);
        }

        return response()->json(['updated' => $touched]);
    }

    /** @return array<string, mixed> */
    private function shape(Product $p): array
    {
        return [
            'id' => $p->id,
            'category_id' => $p->category_id,
            'category' => $p->category?->translationMap('name'),
            'price_minor' => $p->price_minor,
            'currency' => $p->currency,
            'unit_kind' => $p->unit_kind,
            'unit_qty' => (float) $p->unit_qty,
            'is_weight_based' => $p->isWeightBased(),
            'is_popular' => $p->is_popular,
            'is_active' => $p->is_active,
            'in_stock' => $p->in_stock,
            'image' => $p->image_path,
            'image_url' => $p->imageUrl(),
            'thumb_url' => $p->thumbUrl(),
            'has_upload' => $p->image_file !== null,
            'sort' => $p->sort,
            'name' => $p->translationMap('name'),
            'description' => $p->translationMap('description'),
            'unit_label' => $p->translationMap('unit_label'),
        ];
    }
}
