<?php

namespace App\Services;

use App\Models\EmployeeBonusConfig;
use App\Models\PunctualityBonusGroup;
use App\Models\PunctualityRange;
use Illuminate\Support\Collection;

class PunctualityService
{
    /**
     * Calculate weekly punctuality bonus for a set of worked attendances.
     *
     * For each attendance, finds the matching PunctualityRange by entry_late_seconds.
     * The matching range's bonus_percentage is applied to the group's daily bonus amount.
     *
     * @param  Collection<int, object>  $attendances  Objects with `entry_late_seconds`
     * @param  Collection<int, PunctualityRange>  $ranges
     */
    public static function calculateWeeklyBonus(
        Collection $attendances,
        PunctualityBonusGroup $bonusGroup,
        Collection $ranges
    ): float {
        if ($attendances->isEmpty() || $ranges->isEmpty()) {
            return 0.0;
        }

        $dailyBonus = $bonusGroup->dailyBonusAmount();
        $total = 0.0;

        foreach ($attendances as $attendance) {
            $lateSeconds = (int) $attendance->entry_late_seconds;

            foreach ($ranges as $range) {
                if ($range->matches($lateSeconds)) {
                    $total += $dailyBonus * ((float) $range->bonus_percentage / 100);
                    break;
                }
            }
        }

        return round($total, 2);
    }

    /**
     * Calculate weekly bonus from an optional EmployeeBonusConfig.
     * Returns 0.0 when the employee has no active bonus configuration.
     *
     * @param  Collection<int, object>  $attendances
     * @param  Collection<int, PunctualityRange>  $ranges
     */
    public static function calculateWeeklyBonusFromConfig(
        Collection $attendances,
        ?EmployeeBonusConfig $config,
        Collection $ranges
    ): float {
        if ($config === null || $config->bonusGroup === null) {
            return 0.0;
        }

        return self::calculateWeeklyBonus($attendances, $config->bonusGroup, $ranges);
    }
}
