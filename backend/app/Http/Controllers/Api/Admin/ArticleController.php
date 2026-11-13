<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Article;
use App\Models\ArticleTranslation;
use App\Support\Audit;
use App\Support\CatalogueCache;
use App\Support\Slug;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

/**
 * Recipes and articles for the website's /resept/ section: a title, a short
 * summary and the text in each language, and the products the text is about.
 * Plain text like the category pages: blank lines for paragraphs, "## " for
 * a subheading.
 */
class ArticleController extends Controller
{
    private const LOCALES = ['az', 'en', 'ru'];
    private const FIELDS = ['title', 'summary', 'body', 'seo_title', 'seo_description'];

    public function index(): JsonResponse
    {
        return response()->json([
            'data' => Article::with('translations')->orderByDesc('published_on')->orderByDesc('id')->get()
                ->map(fn (Article $a) => self::shape($a))->values(),
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $this->validated($request, null);
        $article = DB::transaction(function () use ($data) {
            $a = Article::create([
                'slug' => $data['slug'],
                'is_published' => $data['is_published'] ?? false,
                'published_on' => $data['published_on'] ?? now()->toDateString(),
                'products' => $data['products'] ?? [],
            ]);
            $this->write($a, $data);

            return $a;
        });
        Audit::record($request->user(), 'article.create', 'article', (string) $article->id, ['slug' => ['from' => null, 'to' => $article->slug]]);

        return response()->json(self::shape($article->fresh('translations')), 201);
    }

    public function update(Request $request, int $id): JsonResponse
    {
        $article = Article::findOrFail($id);
        $data = $this->validated($request, $article);
        DB::transaction(function () use ($article, $data) {
            $article->fill(collect($data)->only(['slug', 'is_published', 'published_on', 'products'])->all())->save();
            $article->touch();
            $this->write($article, $data);
        });
        Audit::record($request->user(), 'article.update', 'article', (string) $id, ['slug' => ['from' => $article->getOriginal('slug'), 'to' => $article->slug]]);

        return response()->json(self::shape($article->fresh('translations')));
    }

    public function destroy(Request $request, int $id): JsonResponse
    {
        $article = Article::findOrFail($id);
        $article->delete();
        CatalogueCache::flush();
        Audit::record($request->user(), 'article.delete', 'article', (string) $id, ['slug' => ['from' => $article->slug, 'to' => null]]);

        return response()->json(['status' => 'ok']);
    }

    private function validated(Request $request, ?Article $existing): array
    {
        $creating = $existing === null;

        return $request->validate([
            'slug' => [$creating ? 'required' : 'sometimes', 'string', 'min:3', 'max:'.Slug::MAX, 'regex:'.Slug::PATTERN,
                Rule::unique('articles', 'slug')->ignore($existing?->id)],
            'is_published' => ['sometimes', 'boolean'],
            'published_on' => ['sometimes', 'nullable', 'date_format:Y-m-d'],
            'products' => ['sometimes', 'array', 'max:30'],
            'products.*' => ['string', 'distinct', Rule::exists('products', 'id')],
            'translations' => [$creating ? 'required' : 'sometimes', 'array'],
            'translations.az.title' => [$creating ? 'required' : 'sometimes', 'string', 'max:140'],
            'translations.*.title' => ['sometimes', 'nullable', 'string', 'max:140'],
            'translations.*.summary' => ['sometimes', 'nullable', 'string', 'max:300'],
            'translations.*.body' => ['sometimes', 'nullable', 'string', 'max:20000'],
            'translations.*.seo_title' => ['sometimes', 'nullable', 'string', 'max:70'],
            'translations.*.seo_description' => ['sometimes', 'nullable', 'string', 'max:170'],
        ]);
    }

    private function write(Article $a, array $data): void
    {
        foreach ($data['translations'] ?? [] as $locale => $fields) {
            if (! in_array($locale, self::LOCALES, true)) {
                continue;
            }
            $row = ArticleTranslation::firstOrNew(['article_id' => $a->id, 'locale' => $locale]);
            // A language without a title has no article in it.
            if (blank($fields['title'] ?? null) && ! $row->exists) {
                continue;
            }
            foreach (self::FIELDS as $f) {
                if (array_key_exists($f, $fields)) {
                    $v = is_string($fields[$f]) ? trim($fields[$f]) : null;
                    $row->{$f} = $v === '' ? null : $v;
                }
            }
            if (blank($row->title)) {
                // Emptying the title takes the language out.
                $row->exists ? $row->delete() : null;
                continue;
            }
            $row->save();
        }
        CatalogueCache::flush();
    }

    public static function shape(Article $a): array
    {
        return [
            'id' => $a->id,
            'slug' => $a->slug,
            'is_published' => $a->is_published,
            'published_on' => $a->published_on?->toDateString(),
            'updated_at' => $a->updated_at?->toAtomString(),
            'products' => array_values($a->products ?? []),
            ...collect(self::FIELDS)->mapWithKeys(fn ($f) => [$f => $a->translationMap($f)])->all(),
        ];
    }
}
