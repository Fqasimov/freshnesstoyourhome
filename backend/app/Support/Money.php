<?php

namespace App\Support;

/**
 * Money in minor units (qəpik).
 *
 * Every amount in this system is an integer. 24.60 AZN is 2460, and the only
 * place a decimal point appears is on its way to a screen. Prices are
 * multiplied by fractional kilos, so the rounding rule has to be stated once,
 * in one place, rather than implied by whatever each call site happens to do.
 */
final class Money
{
    /**
     * Price a line: a unit price times a quantity that may be fractional.
     *
     * Rounds half up to the qəpik. Banker's rounding would be defensible in
     * accounting software; for a shop, "0.5 always goes up" is the rule a
     * customer expects when they check the arithmetic themselves.
     */
    public static function line(int $unitPriceMinor, float $qty): int
    {
        return (int) round($unitPriceMinor * $qty, 0, PHP_ROUND_HALF_UP);
    }

    /** Apply a whole-percent discount, rounding the discount down in the customer's favour. */
    public static function percentOff(int $amountMinor, int $percent): int
    {
        $percent = max(0, min(100, $percent));

        return $amountMinor - (int) floor($amountMinor * $percent / 100);
    }

    public static function format(int $minor, string $currency = 'AZN'): string
    {
        $sign = $minor < 0 ? '-' : '';
        $minor = abs($minor);

        // Built from the integer rather than $minor/100 so that display never
        // depends on float representation.
        $major = number_format(intdiv($minor, 100), 0, '.', ' ');
        $cents = str_pad((string) ($minor % 100), 2, '0', STR_PAD_LEFT);

        return $sign.$major.'.'.$cents.' '.$currency;
    }
}
