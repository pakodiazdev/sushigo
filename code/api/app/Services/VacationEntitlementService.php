<?php

declare(strict_types=1);

namespace App\Services;

use App\Contracts\VacationEntitlementRule;
use App\Models\Employee;
use App\Models\VacationEntitlement;
use Illuminate\Support\Collection;

class VacationEntitlementService
{
    public function __construct(
        private readonly SeniorityService $seniority,
        private readonly VacationEntitlementRule $rule,
    ) {}

    /**
     * Anniversaries the employee has already reached but has no VacationEntitlement for yet.
     *
     * @return array<int, array{calendar_year: int, seniority_year: int, entitled_days: int}>
     */
    public function pendingAnniversaries(Employee $employee): array
    {
        try {
            $completedYears = $this->seniority->completedYears($employee);
        } catch (\LogicException) {
            return [];
        }

        if ($completedYears === 0) {
            return [];
        }

        $start = $this->seniority->effectiveStartDate($employee);
        $existingYears = VacationEntitlement::where('employee_id', $employee->id)->pluck('year')->all();

        $pending = [];

        for ($seniorityYear = 1; $seniorityYear <= $completedYears; $seniorityYear++) {
            $calendarYear = $start->copy()->addYears($seniorityYear)->year;

            if (in_array($calendarYear, $existingYears, true)) {
                continue;
            }

            $pending[] = [
                'calendar_year' => $calendarYear,
                'seniority_year' => $seniorityYear,
                'entitled_days' => $this->rule->calculate($seniorityYear),
            ];
        }

        return $pending;
    }

    /**
     * Persist any pending anniversary entitlements and return the newly created records.
     *
     * @return Collection<int, VacationEntitlement>
     */
    public function generateMissing(Employee $employee): Collection
    {
        return collect($this->pendingAnniversaries($employee))
            ->map(fn (array $pending) => VacationEntitlement::create([
                'employee_id' => $employee->id,
                'year' => $pending['calendar_year'],
                'entitled_days' => $pending['entitled_days'],
                'used_days' => 0,
                'rule_key' => class_basename($this->rule),
            ]));
    }

    /**
     * Seniority years completed and the employee's next anniversary date.
     *
     * @return array{seniority_years: int, next_anniversary_date: ?string}
     */
    public function summary(Employee $employee): array
    {
        try {
            return [
                'seniority_years' => $this->seniority->completedYears($employee),
                'next_anniversary_date' => $this->seniority->nextAnniversary($employee)['date'],
            ];
        } catch (\LogicException) {
            return [
                'seniority_years' => 0,
                'next_anniversary_date' => null,
            ];
        }
    }
}
