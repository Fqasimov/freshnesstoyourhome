<?php

namespace App\Services;

use App\Models\Bundle;

/** One set in a basket: its products at full price, and what the panel takes off. */
final class PricedSet
{
    public function __construct(
        public readonly Bundle $bundle,
        public readonly int $qty,
        public readonly int $fullMinor,
        public readonly int $discountMinor,
    ) {}

    public function priceMinor(): int
    {
        return $this->fullMinor - $this->discountMinor;
    }
}
