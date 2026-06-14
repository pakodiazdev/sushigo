<?php

namespace App\Services;

use App\Models\Holiday;
use Illuminate\Support\Collection;

class PayrollCalculator
{
    /**
     * Calculate total holiday pay for a set of attendances.
     *
     * For each attendance whose date falls on a holiday AND whose day_status is WORKED,
     * the extra pay is: dailyWage × (pay_multiplier − 1).
     *
     * @param  Collection<int, object>  $attendances  Collection of attendance objects with `date` and `day_status` fields.
     * @param  Collection<int, Holiday>  $holidays  Collection of Holiday model instances.
     * @return float Total holiday extra pay amount.
     */
    public static function calculateHolidayPay(
        Collection $attendances,
        Collection $holidays,
        float $dailyWage
    ): float {
        $holidayMap = $holidays->keyBy(fn (Holiday $h) => $h->date->toDateString());

        $total = 0.0;

        foreach ($attendances as $attendance) {
            $dateKey = is_string($attendance->date)
                ? $attendance->date
                : $attendance->date->toDateString();

            if (! isset($holidayMap[$dateKey])) {
                continue;
            }

            if ($attendance->day_status !== 'WORKED') {
                continue;
            }

            $multiplier = (float) $holidayMap[$dateKey]->pay_multiplier;
            $total += $dailyWage * ($multiplier - 1);
        }

        return $total;
    }
}
