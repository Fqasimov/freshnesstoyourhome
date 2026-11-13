<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Product;
use App\Models\Review;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

/**
 * A review from the website. Public and unauthenticated, so it is tightly
 * rate-limited (throttle:review), plain text only, and never shown until it
 * is approved in the panel.
 */
class ReviewController extends Controller
{
    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'product_id' => ['required', 'string', 'max:60', Rule::exists('products', 'id')->where('is_active', true)],
            'name' => ['required', 'string', 'min:2', 'max:60', "regex:/^\\p{L}[\\p{L} '’.-]*\\z/u"],
            'rating' => ['required', 'integer', 'min:1', 'max:5'],
            'text' => ['nullable', 'string', 'max:1000', 'not_regex:/https?:\\/\\/|www\\.|<[a-z\\/]/i'],
            'locale' => ['sometimes', Rule::in(['az', 'ru', 'en'])],
            // A field no person fills in; a bot that fills every field does.
            'website' => ['prohibited'],
        ]);

        Review::create([
            'product_id' => $data['product_id'],
            'name' => trim($data['name']),
            'rating' => $data['rating'],
            'text' => filled($data['text'] ?? null) ? trim($data['text']) : null,
            'locale' => $data['locale'] ?? 'az',
            'status' => Review::PENDING,
        ]);

        return response()->json(['status' => 'pending'], 201);
    }

    /** What the catalogue carries per product: the average and the latest few. */
    public static function summaries(array $productIds): array
    {
        $approved = Review::where('status', Review::APPROVED)->whereIn('product_id', $productIds)
            ->orderByDesc('created_at')->get()->groupBy('product_id');

        return $approved->map(fn ($list) => [
            'rating' => round($list->avg('rating'), 1),
            'count' => $list->count(),
            'latest' => $list->take(5)->map(fn (Review $r) => [
                'name' => $r->name, 'rating' => $r->rating, 'text' => $r->text,
                'locale' => $r->locale, 'date' => $r->created_at?->toDateString(),
            ])->values()->all(),
        ])->all();
    }
}
