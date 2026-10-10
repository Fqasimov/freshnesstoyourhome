<?php

namespace App\Services;

use App\Models\Bundle;
use App\Models\DeliveryZone;
use App\Models\Product;
use App\Support\Money;

/**
 * What a basket costs.
 *
 * The one rule this file exists to enforce: a price comes from the `products`
 * table and nowhere else. A request says which product and how many. It does
 * not say what anything costs, and nothing here reads a price from input.
 *
 * Get this wrong and a modified client — which is every client, since the app
 * bundle is on the customer's own phone — files a full basket for one qəpik.
 */
class PricingService
{
    /**
     * @param  array<int, array{product_id: string, qty: float}>  $lines
     * @param  array<int, array{bundle_id: string, qty: int}>  $bundles  sets, as the panel defines them
     */
    public function quote(array $lines, ?string $zoneId = null, array $bundles = []): PricedBasket
    {
        // A set is its products at their own prices, less the panel's
        // percentage. Its contents and that percentage are read here, never
        // from the request: the client says which set and how many.
        $sets = Bundle::with(['items', 'translations'])
            ->where('is_active', true)
            ->whereIn('id', array_column($bundles, 'bundle_id'))
            ->get()
            ->keyBy('id');

        $ids = array_merge(
            array_column($lines, 'product_id'),
            $sets->flatMap(fn (Bundle $b) => $b->items->pluck('product_id'))->all(),
        );

        $products = Product::orderable()
            ->with('translations')
            ->whereIn('id', $ids)
            ->get()
            ->keyBy('id');

        $priced = [];
        $subtotal = 0;
        $requiresWeighing = false;
        $unavailable = [];

        foreach ($lines as $line) {
            $product = $products->get($line['product_id']);

            if ($product === null) {
                // Either it does not exist, or it is inactive or out of stock.
                // Either way it cannot be sold, and the basket is reported back
                // to the customer rather than silently losing a line.
                $unavailable[] = $line['product_id'];

                continue;
            }

            $qty = (float) $line['qty'];
            $lineTotal = Money::line($product->price_minor, $qty);

            $priced[] = new PricedLine(
                product: $product,
                qty: $qty,
                unitPriceMinor: $product->price_minor,
                lineTotalMinor: $lineTotal,
                isWeightBased: $product->isWeightBased(),
            );

            $subtotal += $lineTotal;
            $requiresWeighing = $requiresWeighing || $product->isWeightBased();
        }

        $pricedSets = [];
        $unavailableSets = [];
        $discount = 0;

        foreach ($bundles as $wanted) {
            $set = $sets->get($wanted['bundle_id']);
            $qty = (int) $wanted['qty'];

            // Switched off, emptied, or holding something that cannot be sold
            // today: the whole set goes, as the catalogue already hides it.
            if ($set === null || $set->items->isEmpty()
                || $set->items->contains(fn ($item) => ! $products->has($item->product_id))) {
                $unavailableSets[] = $wanted['bundle_id'];

                continue;
            }

            $full = 0;
            foreach ($set->items as $item) {
                $product = $products->get($item->product_id);
                $itemQty = (float) $item->qty * $qty;
                $lineTotal = Money::line($product->price_minor, $itemQty);

                $priced[] = new PricedLine(
                    product: $product,
                    qty: $itemQty,
                    unitPriceMinor: $product->price_minor,
                    lineTotalMinor: $lineTotal,
                    isWeightBased: $product->isWeightBased(),
                    bundleId: $set->id,
                );

                $full += $lineTotal;
                $requiresWeighing = $requiresWeighing || $product->isWeightBased();
            }

            $off = $full - Money::percentOff($full, $set->discount_percent);
            $pricedSets[] = new PricedSet($set, $qty, $full, $off);
            $subtotal += $full;
            $discount += $off;
        }

        $zone = $zoneId === null
            ? null
            : DeliveryZone::where('is_active', true)->find($zoneId);

        $deliveryFee = $zone?->fee_minor ?? 0;
        $minimum = $zone?->min_order_minor ?? 0;

        return new PricedBasket(
            lines: $priced,
            unavailableProductIds: $unavailable,
            subtotalMinor: $subtotal,
            deliveryFeeMinor: $deliveryFee,
            discountMinor: $discount,
            totalMinor: $subtotal - $discount + $deliveryFee,
            requiresWeighing: $requiresWeighing,
            minimumOrderMinor: $minimum,
            zone: $zone,
            sets: $pricedSets,
            unavailableBundleIds: $unavailableSets,
        );
    }
}
