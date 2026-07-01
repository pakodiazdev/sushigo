<?php

declare(strict_types=1);

namespace App\Services;

use App\Models\Employee;
use App\Models\VacationPolicy;
use Carbon\Carbon;

class SeniorityService
{
    /**
     * Effective seniority start date considering employment period continuity.
     *
     * Internal transfers (branch changes) preserve accumulated seniority.
     * Real terminations (resignation, dismissal, contract_end) reset it.
     */
    public function effectiveStartDate(Employee $employee): Carbon
    {
        $periods = $employee->employmentPeriods()
            ->reorder('start_date', 'asc')
            ->get();

        if ($periods->isEmpty()) {
            throw new \LogicException("Employee #{$employee->id} has no employment periods.");
        }

        $effectiveStart = Carbon::parse($periods->first()->start_date);
        $previousTerminationType = null;

        foreach ($periods as $period) {
            // If the previous period ended with a real termination, reset seniority
            if ($previousTerminationType !== null && $previousTerminationType->resetsSeniority()) {
                $effectiveStart = Carbon::parse($period->start_date);
            }

            $previousTerminationType = $period->termination_type;
        }

        return $effectiveStart;
    }

    /**
     * Number of complete seniority years as of the given date (defaults to today).
     */
    public function completedYears(Employee $employee, ?Carbon $at = null): int
    {
        $at ??= Carbon::today();
        $start = $this->effectiveStartDate($employee);

        return (int) $start->diffInYears($at);
    }

    /**
     * Next anniversary details: date, seniority year number, and entitled days from policy.
     */
    public function nextAnniversary(Employee $employee, ?Carbon $at = null): array
    {
        $at ??= Carbon::today();
        $start = $this->effectiveStartDate($employee);
        $completedYears = (int) $start->diffInYears($at);

        $nextSeniorityYear = $completedYears + 1;
        $nextAnniversaryDate = $start->copy()->addYears($nextSeniorityYear);

        $entitledDays = $this->entitledDaysForSeniorityYear($nextSeniorityYear, $nextAnniversaryDate);

        return [
            'date' => $nextAnniversaryDate->toDateString(),
            'seniority_year' => $nextSeniorityYear,
            'entitled_days' => $entitledDays,
            'days_until' => (int) $at->diffInDays($nextAnniversaryDate, false),
        ];
    }

    /**
     * Days entitled for a given seniority year, using the policy effective on that date.
     */
    public function entitledDaysForSeniorityYear(int $year, Carbon $onDate): int
    {
        $policy = VacationPolicy::where('year_of_seniority', $year)
            ->where('effective_from', '<=', $onDate->toDateString())
            ->orderByDesc('effective_from')
            ->first();

        if ($policy) {
            return $policy->entitled_days;
        }

        // Fallback: find highest defined year and extrapolate LFT pattern (+2 per 5 years)
        $maxPolicy = VacationPolicy::where('effective_from', '<=', $onDate->toDateString())
            ->orderByDesc('year_of_seniority')
            ->first();

        if (! $maxPolicy) {
            return 12; // LFT minimum
        }

        $extraFiveYearPeriods = (int) ceil(($year - $maxPolicy->year_of_seniority) / 5);

        return $maxPolicy->entitled_days + ($extraFiveYearPeriods * 2);
    }

    /**
     * Anniversary date for a specific seniority year.
     */
    public function anniversaryDateForYear(Employee $employee, int $seniorityYear): Carbon
    {
        return $this->effectiveStartDate($employee)->copy()->addYears($seniorityYear);
    }
}
