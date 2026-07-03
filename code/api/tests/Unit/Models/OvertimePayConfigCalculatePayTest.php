<?php

namespace Tests\Unit\Models;

use App\Models\OvertimePayConfig;
use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class OvertimePayConfigCalculatePayTest extends TestCase
{
    private static function lftConfig(string $factor): OvertimePayConfig
    {
        $config = new OvertimePayConfig;
        $config->valuation_method = 'LFT_PROPORTIONAL';
        $config->lft_factor = $factor;

        return $config;
    }

    private static function agreedConfig(string $hourlyRate): OvertimePayConfig
    {
        $config = new OvertimePayConfig;
        $config->valuation_method = 'AGREED_RATE';
        $config->hourly_rate = $hourlyRate;

        return $config;
    }

    public static function lftProportionalProvider(): array
    {
        return [
            'daily $240, factor 2, 60 min' => ['240.00', '2.00', 60, 60.00],
            'daily $200, factor 3, 30 min' => ['200.00', '3.00', 30, 37.50],
            'daily $160, factor 2, 15 min' => ['160.00', '2.00', 15, 10.00],
        ];
    }

    #[Test]
    #[DataProvider('lftProportionalProvider')]
    public function calculates_pay_for_lft_proportional_method(
        string $dailyWage,
        string $factor,
        int $minutes,
        float $expected,
    ): void {
        $config = self::lftConfig($factor);

        $this->assertEqualsWithDelta($expected, $config->calculatePay($minutes, (float) $dailyWage), 0.01);
    }

    public static function agreedRateProvider(): array
    {
        return [
            'rate $90/hr, 60 min' => ['90.00', 60, 90.00],
            'rate $120/hr, 30 min' => ['120.00', 30, 60.00],
            'rate $60/hr, 15 min' => ['60.00', 15, 15.00],
        ];
    }

    #[Test]
    #[DataProvider('agreedRateProvider')]
    public function calculates_pay_for_agreed_rate_method(
        string $hourlyRate,
        int $minutes,
        float $expected,
    ): void {
        $config = self::agreedConfig($hourlyRate);

        $this->assertEqualsWithDelta($expected, $config->calculatePay($minutes, 0.0), 0.01);
    }
}
