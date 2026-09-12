<?php

namespace App\Services;

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
     */
    public function quote(array $lines, ?string $zoneId = null): PricedBasket
    {
        $ids = array_column($lines, 'product_id');

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
}
