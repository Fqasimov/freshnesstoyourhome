<?php

namespace App\Support;

use Carbon\CarbonImmutable;

/**
 * Which delivery dates the shop takes, in Baku time. The server's clock is
 * UTC, which for four hours each night is still yesterday in Baku.
 *
 * Today is offered until the delivery day closes (DELIVERY_CLOSE); after
 * that the earliest date is tomorrow.
 */
final class OrderDates
{
    public const TIMEZONE = 'Asia/Baku';

    public static function now(): CarbonImmutable
    {
        return CarbonImmutable::now(self::TIMEZONE);
    }

    public static function earliest(): string
    {
        $now = self::now();
        $lead = (int) config('freshness.order.lead_days');
        if ($lead === 0 && $now->format('H:i') >= (string) config('freshness.order.delivery_close')) {
            $lead = 1;
        }

        return $now->addDays($lead)->toDateString();
    }

    public static function latest(): string
    {
        return self::now()->addDays((int) config('freshness.order.max_days_ahead'))->toDateString();
    }

    /** Validation rules for a delivery date, after the required/nullable part. */
    public static function rules(): array
    {
        return ['date_format:Y-m-d', 'after_or_equal:'.self::earliest(), 'before_or_equal:'.self::latest()];
    }
}
