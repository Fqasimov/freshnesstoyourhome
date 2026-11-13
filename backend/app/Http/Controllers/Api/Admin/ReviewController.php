<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Review;
use App\Support\Audit;
use App\Support\CatalogueCache;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

/** Reviews waiting for a decision, and the ones already made. */
class ReviewController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $status = $request->validate(['status' => ['sometimes', Rule::in([Review::PENDING, Review::APPROVED, Review::REJECTED])]])['status'] ?? null;

        return response()->json([
            'data' => Review::when($status, fn ($q) => $q->where('status', $status))
                ->orderByDesc('created_at')->limit(300)->get(),
            'pending' => Review::where('status', Review::PENDING)->count(),
        ]);
    }

    public function update(Request $request, int $id): JsonResponse
    {
        $data = $request->validate(['status' => ['required', Rule::in([Review::APPROVED, Review::REJECTED, Review::PENDING])]]);
        $review = Review::findOrFail($id);
        $from = $review->status;
        $review->update(['status' => $data['status']]);
        CatalogueCache::flush();
        Audit::record($request->user(), 'review.update', 'review', (string) $id, ['status' => ['from' => $from, 'to' => $data['status']]]);

        return response()->json($review);
    }

    public function destroy(Request $request, int $id): JsonResponse
    {
        Review::findOrFail($id)->delete();
        CatalogueCache::flush();
        Audit::record($request->user(), 'review.delete', 'review', (string) $id, []);

        return response()->json(['status' => 'ok']);
    }
}
