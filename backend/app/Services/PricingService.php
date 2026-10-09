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
     * What one unit of a product costs inside a set.
     *
     * Each unit is discounted and rounded to the qəpik on its own, so the
     * price on an order line, the set's price on the website and the one in
     * the panel are the same arithmetic and cannot disagree by a qəpik.
     */
    public static function bundleUnitMinor(int $unitPriceMinor, int $percent): int
    {
        $percent = max(0, min(100, $percent));

        return (int) round($unitPriceMinor * (100 - $percent) / 100, 0, PHP_ROUND_HALF_UP);
    }

    /**
     * @param  array<int, array{product_id: string, qty: float}>  $lines
     * @param  array<int, array{id: string, qty: int|float}>  $bundles  sets, bought whole
     */
    public function quote(array $lines, ?string $zoneId = null, array $bundles = []): PricedBasket
    {
        $sets = $this->orderableBundles($bundles);
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

        // A set is its products at the set's discount, written as ordinary
        // lines at the discounted unit price. The weigh-at-the-door step
        // re-prices from the unit price on the line, so the discount survives
        // the scales too.
        foreach ($bundles as $request) {
            $bundle = $sets->get($request['id']);
            $times = (float) $request['qty'];

            if ($bundle === null) {
                $unavailable[] = 'bundle:'.$request['id'];

                continue;
            }

            $missing = $bundle->items->first(fn ($item) => ! $products->has($item->product_id));
            if ($missing !== null) {
                $unavailable[] = $missing->product_id;

                continue;
            }

            foreach ($bundle->items as $item) {
                $product = $products->get($item->product_id);
                $unit = self::bundleUnitMinor($product->price_minor, $bundle->discount_percent);
                $qty = (float) $item->qty * $times;
                $lineTotal = Money::line($unit, $qty);

                $priced[] = new PricedLine(
                    product: $product,
                    qty: $qty,
                    unitPriceMinor: $unit,
                    lineTotalMinor: $lineTotal,
                    isWeightBased: $product->isWeightBased(),
                );

                $subtotal += $lineTotal;
                $requiresWeighing = $requiresWeighing || $product->isWeightBased();
            }
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
            discountMinor: 0,
            totalMinor: $subtotal + $deliveryFee,
            requiresWeighing: $requiresWeighing,
            minimumOrderMinor: $minimum,
            zone: $zone,
        );
    }

    /** The sets asked for that are switched on, keyed by id. */
    private function orderableBundles(array $bundles)
    {
        if ($bundles === []) {
            return collect();
        }

        return Bundle::with('items')
            ->where('is_active', true)
            ->whereIn('id', array_column($bundles, 'id'))
            ->get()
            ->keyBy('id');
    }
}
