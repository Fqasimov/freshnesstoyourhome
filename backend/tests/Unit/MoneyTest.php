<?php

namespace Tests\Unit;

use App\Support\Money;
use PHPUnit\Framework\TestCase;

/**
 * Money is integer qəpik throughout. These are the rounding rules everything
 * else relies on, pinned so a refactor cannot quietly change a bill.
 */
class MoneyTest extends TestCase
{
    public function test_a_whole_quantity_is_exact(): void
    {
        $this->assertSame(6500, Money::line(6500, 1));
        $this->assertSame(13000, Money::line(6500, 2));
    }

    public function test_a_fractional_weight_rounds_half_up(): void
    {
        // 6500 * 1.234 = 8021.0
        $this->assertSame(8021, Money::line(6500, 1.234));
        // 1000 * 0.5 = 500, exact
        $this->assertSame(500, Money::line(1000, 0.5));
        // 101 * 0.5 = 50.5 -> 51, in the shop's favour by half a qəpik
        $this->assertSame(51, Money::line(101, 0.5));
    }

    public function test_a_discount_rounds_in_the_customers_favour(): void
    {
        $this->assertSame(9000, Money::percentOff(10000, 10));
        // 10% of 1005 is 100.5; the discount rounds down to 100, so the
        // customer pays 905 rather than 904.
        $this->assertSame(905, Money::percentOff(1005, 10));
    }

    public function test_a_discount_is_clamped_to_a_sane_range(): void
    {
        $this->assertSame(10000, Money::percentOff(10000, -50));
        $this->assertSame(0, Money::percentOff(10000, 200));
    }

    public function test_formatting_never_loses_a_qepik(): void
    {
        $this->assertSame('24.60 AZN', Money::format(2460));
        $this->assertSame('0.05 AZN', Money::format(5));
        $this->assertSame('0.00 AZN', Money::format(0));
        $this->assertSame('1 234 567.89 AZN', Money::format(123456789));
        $this->assertSame('-3.50 AZN', Money::format(-350));
    }
}
