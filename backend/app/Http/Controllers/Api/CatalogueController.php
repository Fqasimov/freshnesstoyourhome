<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Category;
use App\Models\DeliveryZone;
use App\Models\Bundle;
use App\Models\Product;
use App\Support\CatalogueCache;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Cache;

/**
 * The catalogue, in every language at once.
 *
 * Public: browsing does not require an account, so the website and the app's
 * first screen work before anyone signs in.
 *
 * All three translations are sent together rather than one per request. The
 * payload is small, and it means switching language in the app is instant and
 * works offline instead of being a round trip.
 */
class CatalogueController extends Controller
{
    public function index(): JsonResponse
    {
        // Everything below is reduced to plain arrays with ->all() before it is
        // cached. A Collection survives a round trip through the cache only if
        // it can be unserialised on the way back; when it cannot, the endpoint
        // returns {"__PHP_Incomplete_Class_Name": ...} instead of the
        // catalogue — and only from the second request onwards, because the
        // first one is a cache miss and never serialises anything. That is a
        // bug that passes every smoke test and breaks in production.
        // Cached because it changes when a shopkeeper edits a price, not when
        // a customer opens the app. The seeder and the admin path both clear
        // it, and a minute of staleness on a price is acceptable where a
        // database round trip per app launch is not.
        $payload = Cache::remember(CatalogueCache::KEY, now()->addMinutes(10), function () {
            $categories = Category::with('translations')
                ->where('is_active', true)
                ->orderBy('sort')
                ->get()
                ->map(fn (Category $c) => [
                    'id' => $c->id,
                    'name' => $c->translationMap('name'),
                ])
                ->all();

            $products = Product::with('translations')
                ->orderable()
                ->orderBy('sort')
                ->get()
                ->map(fn (Product $p) => [
                    'id' => $p->id,
                    'category_id' => $p->category_id,
                    'price_minor' => $p->price_minor,
                    'currency' => $p->currency,
                    'unit_kind' => $p->unit_kind,
                    'unit_qty' => $p->unit_qty,
                    // The client uses this to warn, before checkout, that the
                    // final price depends on what the scales say.
                    'is_weight_based' => $p->isWeightBased(),
                    'is_popular' => $p->is_popular,
                    // Two keys, on purpose. `image` names the picture inside
                    // the client's own bundle and is what every build so far
                    // has used; `image_url` is a photograph uploaded in the
                    // admin panel. A client prefers the URL when it is there
                    // and falls back to the bundle when it is not, so removing
                    // an upload restores the original rather than leaving a
                    // gap, and an older app keeps working unchanged.
                    'image' => $p->image_path,
                    'image_url' => $p->imageUrl(),
                    'thumb_url' => $p->thumbUrl(),
                    'name' => $p->translationMap('name'),
                    'description' => $p->translationMap('description'),
                    'unit_label' => $p->translationMap('unit_label'),
                ])
                ->all();

            /**
             * Bundles, but only the ones that can actually be delivered.
             *
             * A bundle is a list of products at a discount, so it is only real
             * while every product in it is on sale and in stock. Sending one
             * with a missing item would put a set on the front page that the
             * order endpoint then refuses — the customer would find out at
             * checkout. Filtering here is the difference between a promotion
             * and an apology.
             */
            $orderable = collect($products)->keyBy('id');

            $bundles = Bundle::with(['translations', 'items'])
                ->where('is_active', true)
                ->orderBy('sort')
                ->get()
                ->filter(fn (Bundle $b) => $b->items->isNotEmpty()
                    && $b->items->every(fn ($item) => $orderable->has($item->product_id)))
                ->map(fn (Bundle $b) => [
                    'id' => $b->id,
                    'discount_percent' => $b->discount_percent,
                    // Null unless the shop photographed the set itself, in
                    // which case the website shows it instead of the strip of
                    // its four products.
                    'image_url' => $b->imageUrl(),
                    'thumb_url' => $b->thumbUrl(),
                    'name' => $b->translationMap('name'),
                    'description' => $b->translationMap('description'),
                    'items' => $b->items
                        ->map(fn ($item) => [
                            'product_id' => $item->product_id,
                            'qty' => (float) $item->qty,
                        ])
                        ->all(),
                ])
                ->values()
                ->all();

            $zones = DeliveryZone::with('translations')
                ->where('is_active', true)
                ->orderBy('sort')
                ->get()
                ->map(fn (DeliveryZone $z) => [
                    'id' => $z->id,
                    'name' => $z->translationMap('name'),
                    'fee_minor' => $z->fee_minor,
                    'min_order_minor' => $z->min_order_minor,
                ])
                ->all();

            return [
                'categories' => $categories,
                'products' => $products,
                'bundles' => $bundles,
                'zones' => $zones,
                'currency' => config('freshness.currency'),
                'delivery' => [
                    'open' => config('freshness.order.delivery_open'),
                    'close' => config('freshness.order.delivery_close'),
                    'lead_days' => (int) config('freshness.order.lead_days'),
                    'weight_tolerance_percent' => (int) config('freshness.order.weight_tolerance_percent'),
                    // So the sign-in screen can tell the customer how long
                    // their code lasts without hardcoding a number that would
                    // then have to agree with the server's by luck.
                    'code_ttl_minutes' => (int) config('freshness.auth.code_ttl_minutes'),
                ],
            ];
        });

        return response()->json($payload);
    }
}
