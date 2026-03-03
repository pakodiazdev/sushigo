<?php

namespace App\Actions\Schedule;

use App\Models\EmploymentPeriod;
use App\Models\ScheduleDayOverride;

class CreateScheduleDayOverrideAction
{
    /**
     * Create a day-level override for the given employment period.
     *
     * The caller decides the scope by passing effective_from / effective_to:
     *   - Single date  : effective_from = effective_to = chosen date
     *   - Date range   : effective_from = start, effective_to = end
     *   - Indefinite   : effective_from = start, effective_to = NULL
     *
     * When is_day_off = true, all time fields are nullified regardless of input.
     */
    public function __invoke(EmploymentPeriod $period, array $data): ScheduleDayOverride
    {
        $isDayOff = (bool) ($data['is_day_off'] ?? false);

        $override = ScheduleDayOverride::create([
            'employment_period_id'   => $period->id,
            'day_of_week'            => $data['day_of_week'],
            'effective_from'         => $data['effective_from'],
            'effective_to'           => $data['effective_to'] ?? null,
            'is_day_off'             => $isDayOff,
            'expected_start'         => $isDayOff ? null : ($data['expected_start'] ?? null),
            'expected_lunch_start'   => $isDayOff ? null : ($data['expected_lunch_start'] ?? null),
            'expected_lunch_end'     => $isDayOff ? null : ($data['expected_lunch_end'] ?? null),
            'lunch_duration_minutes' => $isDayOff ? null : ($data['lunch_duration_minutes'] ?? null),
            'expected_end'           => $isDayOff ? null : ($data['expected_end'] ?? null),
            'note'                   => $data['note'] ?? null,
        ]);

        $override->load('employmentPeriod');

        return $override;
    }
}
