<?php

namespace Tests\Unit\Services;

use App\Models\EmployeeBonusConfig;
use App\Models\PunctualityBonusGroup;
use App\Models\PunctualityRange;
use App\Services\PunctualityService;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class PunctualityServiceTest extends TestCase
{
    private function makeRange(int $minSeconds, ?int $maxSeconds, float $bonusPercentage, int $sortOrder = 1): PunctualityRange
    {
        $range = new PunctualityRange;
        $range->min_seconds = $minSeconds;
        $range->max_seconds = $maxSeconds;
        $range->bonus_percentage = $bonusPercentage;
        $range->sort_order = $sortOrder;

        return $range;
    }

    private function makeBonusGroup(float $weeklyBonus, int $divisor): PunctualityBonusGroup
    {
        $group = new PunctualityBonusGroup;
        $group->weekly_bonus_amount = $weeklyBonus;
        $group->working_days_divisor = $divisor;

        return $group;
    }

    private function makeAttendance(int $entryLateSeconds): object
    {
        return (object) ['entry_late_seconds' => $entryLateSeconds];
    }

    // ── Happy path ────────────────────────────────────────────────────────────

    #[Test]
    public function returns_full_bonus_when_all_days_perfectly_on_time(): void
    {
        // Range: 0–0 seconds late → 100%
        $ranges = collect([
            $this->makeRange(0, 0, 100.0, 1),
        ]);
        $group = $this->makeBonusGroup(600.0, 6); // daily = 100

        $attendances = collect([
            $this->makeAttendance(0),
            $this->makeAttendance(0),
            $this->makeAttendance(0),
        ]);

        $result = PunctualityService::calculateWeeklyBonus($attendances, $group, $ranges);

        // 3 × (100 × 1.0) = 300
        $this->assertEquals(300.0, $result);
    }

    #[Test]
    public function returns_partial_bonus_when_some_days_within_grace_range(): void
    {
        $ranges = collect([
            $this->makeRange(0, 0, 100.0, 1),      // exactly on time
            $this->makeRange(1, 900, 50.0, 2),      // up to 15 min late
        ]);
        $group = $this->makeBonusGroup(600.0, 6); // daily = 100

        $attendances = collect([
            $this->makeAttendance(0),    // on time → 100% → 100
            $this->makeAttendance(300),  // 5 min late → 50% → 50
            $this->makeAttendance(300),  // 5 min late → 50% → 50
        ]);

        $result = PunctualityService::calculateWeeklyBonus($attendances, $group, $ranges);

        $this->assertEquals(200.0, $result);
    }

    #[Test]
    public function returns_zero_when_no_range_matches(): void
    {
        $ranges = collect([
            $this->makeRange(0, 900, 100.0, 1), // 0–15 min late
        ]);
        $group = $this->makeBonusGroup(600.0, 6);

        // All attendances are > 900 seconds late — no range matches
        $attendances = collect([
            $this->makeAttendance(1800),
            $this->makeAttendance(3600),
        ]);

        $result = PunctualityService::calculateWeeklyBonus($attendances, $group, $ranges);

        $this->assertEquals(0.0, $result);
    }

    #[Test]
    public function uses_open_ended_range_when_max_is_null(): void
    {
        // Range 0–∞ seconds → 75%
        $ranges = collect([
            $this->makeRange(0, null, 75.0, 1),
        ]);
        $group = $this->makeBonusGroup(400.0, 4); // daily = 100

        $attendances = collect([
            $this->makeAttendance(0),
            $this->makeAttendance(99999), // very late — still matches open-ended range
        ]);

        $result = PunctualityService::calculateWeeklyBonus($attendances, $group, $ranges);

        // 2 × (100 × 0.75) = 150
        $this->assertEquals(150.0, $result);
    }

    #[Test]
    public function returns_zero_when_attendances_empty(): void
    {
        $ranges = collect([
            $this->makeRange(0, null, 100.0),
        ]);
        $group = $this->makeBonusGroup(600.0, 6);

        $result = PunctualityService::calculateWeeklyBonus(collect(), $group, $ranges);

        $this->assertEquals(0.0, $result);
    }

    #[Test]
    public function returns_zero_when_ranges_empty(): void
    {
        $group = $this->makeBonusGroup(600.0, 6);

        $attendances = collect([
            $this->makeAttendance(0),
            $this->makeAttendance(0),
        ]);

        $result = PunctualityService::calculateWeeklyBonus($attendances, $group, collect());

        $this->assertEquals(0.0, $result);
    }

    #[Test]
    public function employee_without_bonus_config_returns_zero(): void
    {
        $result = PunctualityService::calculateWeeklyBonusFromConfig(
            collect([$this->makeAttendance(0)]),
            null,  // no EmployeeBonusConfig
            collect()
        );

        $this->assertEquals(0.0, $result);
    }
}
