<?php

namespace App\Services;

use App\Models\DeliveryZone;
use App\Support\Money;

final class PricedBasket
{
    /**
     * @param  array<int, PricedLine>  $lines
     * @param  array<int, string>  $unavailableProductIds
     */
    public function __construct(
        public readonly array $lines,
        public readonly array $unavailableProductIds,
        public readonly int $subtotalMinor,
        public readonly int $deliveryFeeMinor,
        public readonly int $discountMinor,
        public readonly int $totalMinor,
        public readonly bool $requiresWeighing,
        public readonly int $minimumOrderMinor,
        public readonly ?DeliveryZone $zone,
    ) {}

    public function hasUnavailable(): bool
    {
        return $this->unavailableProductIds !== [];
    }

    public function meetsMinimum(): bool
    {
        return $this->subtotalMinor >= $this->minimumOrderMinor;
    }

    public function isEmpty(): bool
    {
        return $this->lines === [];
    }

    /**
     * How far the final bill may move once weighed goods are on the scales.
     *
     * Shown to the customer before they confirm, so "about 48 AZN, at most 53"
     * is what they agree to — rather than discovering the difference at the
     * door. Only weighed lines contribute; a tin of caviar is exactly a tin.
     */
    public function weighedCeilingMinor(): int
    {
        if (! $this->requiresWeighing) {
            return $this->totalMinor;
        }

        $tolerance = (int) config('freshness.order.weight_tolerance_percent');

        $weighed = 0;
        foreach ($this->lines as $line) {
            if ($line->isWeightBased) {
                $weighed += $line->lineTotalMinor;
            }
        }

        return $this->totalMinor + (int) ceil($weighed * $tolerance / 100);
    }

    public function toArray(?string $locale = null): array
    {
        return [
            'lines' => array_map(fn (PricedLine $l) => [
                'product_id' => $l->product->id,
                'name' => $l->product->nameIn($locale),
                'qty' => $l->qty,
                'unit_price_minor' => $l->unitPriceMinor,
                'line_total_minor' => $l->lineTotalMinor,
                'is_weight_based' => $l->isWeightBased,
            ], $this->lines),
            'unavailable_product_ids' => $this->unavailableProductIds,
            'subtotal_minor' => $this->subtotalMinor,
            'delivery_fee_minor' => $this->deliveryFeeMinor,
            'discount_minor' => $this->discountMinor,
            'total_minor' => $this->totalMinor,
            'total_display' => Money::format($this->totalMinor),
            'requires_weighing' => $this->requiresWeighing,
            'weighed_ceiling_minor' => $this->weighedCeilingMinor(),
            'minimum_order_minor' => $this->minimumOrderMinor,
            'meets_minimum' => $this->meetsMinimum(),
            'currency' => config('freshness.currency'),
        ];
    }
}
