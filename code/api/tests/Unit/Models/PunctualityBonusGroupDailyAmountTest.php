<?php

namespace Tests\Unit\Models;

use App\Models\PunctualityBonusGroup;
use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class PunctualityBonusGroupDailyAmountTest extends TestCase
{
    private static function group(string $weekly, int $divisor): PunctualityBonusGroup
    {
        $g = new PunctualityBonusGroup;
        $g->weekly_bonus_amount = $weekly;
        $g->working_days_divisor = $divisor;

        return $g;
    }

    public static function dailyAmountProvider(): array
    {
        return [
            '$110 ÷ 6 = $18.33' => ['110.00', 6, 18.33],
            '$100 ÷ 6 = $16.67' => ['100.00', 6, 16.67],
            '$50 ÷ 3 = $16.67' => ['50.00',  3, 16.67],
            '$100 ÷ 5 = $20.00' => ['100.00', 5, 20.00],
        ];
    }

    #[Test]
    #[DataProvider('dailyAmountProvider')]
    public function daily_bonus_amount_divides_weekly_by_divisor(
        string $weekly,
        int $divisor,
        float $expected,
    ): void {
        $group = self::group($weekly, $divisor);
        $this->assertSame($expected, $group->dailyBonusAmount());
    }
}
