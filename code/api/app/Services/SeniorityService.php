<?php

declare(strict_types=1);

namespace App\Services;

use App\Models\Employee;
use App\Support\Clock\ApplicationClock;
use Carbon\Carbon;

class SeniorityService
{
    public function __construct(
        private readonly VacationEntitlementResolver $resolver,
        private readonly ApplicationClock $clock,
    ) {}

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
     * Number of complete seniority years as of the given date (defaults to
     * today per the Application Clock, not the OS clock — respects simulated
     * time so manual QA/demo time-travel affects vacation entitlement too).
     */
    public function completedYears(Employee $employee, ?Carbon $at = null): int
    {
        $at ??= Carbon::parse($this->clock->todayInBusinessTz());
        $start = $this->effectiveStartDate($employee);

        return (int) $start->diffInYears($at);
    }

    /**
     * Next anniversary details: date, seniority year number, and entitled days from active rule.
     */
    public function nextAnniversary(Employee $employee, ?Carbon $at = null): array
    {
        $at ??= Carbon::parse($this->clock->todayInBusinessTz());
        $start = $this->effectiveStartDate($employee);
        $completedYears = (int) $start->diffInYears($at);

        $nextSeniorityYear = $completedYears + 1;
        $nextAnniversaryDate = $start->copy()->addYears($nextSeniorityYear);

        return [
            'date' => $nextAnniversaryDate->toDateString(),
            'seniority_year' => $nextSeniorityYear,
            'entitled_days' => $this->resolver->resolve($employee)->calculate($nextSeniorityYear),
            'days_until' => (int) $at->diffInDays($nextAnniversaryDate, false),
        ];
    }

    /**
     * Anniversary date for a specific seniority year.
     */
    public function anniversaryDateForYear(Employee $employee, int $seniorityYear): Carbon
    {
        return $this->effectiveStartDate($employee)->copy()->addYears($seniorityYear);
    }
}
