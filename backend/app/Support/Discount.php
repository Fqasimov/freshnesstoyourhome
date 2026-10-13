<?php

namespace App\Support;

/**
 * The one piece of arithmetic behind every sale price.
 *
 * A discount is either a percentage of the normal price (to two decimals:
 * 16.4%) or an amount off it (−2 AZN). Percentages are worked in hundredths of
 * a percent, as whole numbers, so 16.4% is 1640 and nothing depends on how a
 * float happens to round. The website repeats exactly this in
 * web/src/data/catalogue.js; change one, change both.
 */
final class Discount
{
    public const PERCENT = 'percent';
    public const AMOUNT = 'amount';

    /** 16.4 -> 1640 */
    public static function basisPoints(float|int|string|null $percent): int
    {
        return max(0, min(10000, (int) round(((float) $percent) * 100)));
    }

    /** A price with a percentage taken off, rounded to the qəpik. */
    public static function percentOff(int $minor, int $basisPoints): int
    {
        $bp = max(0, min(10000, $basisPoints));

        return (int) round($minor * (10000 - $bp) / 10000, 0, PHP_ROUND_HALF_UP);
    }

    /**
     * A part of a whole, scaled so the whole loses `$off`: how an amount off a
     * set reaches each product in it. Each unit keeps its share of the price.
     */
    public static function shareOf(int $minor, int $wholeMinor, int $offMinor): int
    {
        if ($wholeMinor <= 0) {
            return $minor;
        }

        $off = max(0, min($wholeMinor, $offMinor));

        return (int) round($minor * ($wholeMinor - $off) / $wholeMinor, 0, PHP_ROUND_HALF_UP);
    }

    /**
     * What the website shows.
     *
     * @return array{show: string, percent: float, amount_minor: int}|null
     */
    public static function badge(string $show, ?string $kind, float $enteredPercent, int $fullMinor, int $priceMinor): ?array
    {
        $saving = $fullMinor - $priceMinor;

        if ($saving <= 0 || $fullMinor <= 0) {
            return null;
        }

        return [
            'show' => $show === self::AMOUNT ? self::AMOUNT : self::PERCENT,
            // The figure the shop typed when it typed a percentage; otherwise
            // what the amount comes to, to one decimal. Never more than is
            // really taken off.
            'percent' => $kind === self::PERCENT
                ? round($enteredPercent, 2)
                : floor($saving / $fullMinor * 1000) / 10,
            'amount_minor' => $saving,
        ];
    }
}
