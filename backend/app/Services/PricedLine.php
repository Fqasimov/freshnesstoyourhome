<?php

namespace App\Services;

use App\Models\Product;

/** One priced basket line. Immutable — it is a computation, not a record. */
final class PricedLine
{
    public function __construct(
        public readonly Product $product,
        public readonly float $qty,
        public readonly int $unitPriceMinor,
        public readonly int $lineTotalMinor,
        public readonly bool $isWeightBased,
        /** The set this line came in, if any. */
        public readonly ?string $bundleId = null,
    ) {}

    /** Names in every language, frozen at the moment of sale. */
    public function nameSnapshot(): array
    {
        return $this->product->translationMap('name');
    }
}
