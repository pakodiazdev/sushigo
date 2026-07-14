<?php

declare(strict_types=1);

namespace App\Services;

use App\Models\Employee;
use App\Models\VacationEntitlement;
use Illuminate\Support\Collection;

class VacationEntitlementService
{
    public function __construct(
        private readonly SeniorityService $seniority,
        private readonly VacationEntitlementResolver $resolver,
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
        $rule = $this->resolver->resolve($employee);

        $pending = [];

        for ($seniorityYear = 1; $seniorityYear <= $completedYears; $seniorityYear++) {
            $calendarYear = $start->copy()->addYears($seniorityYear)->year;

            if (in_array($calendarYear, $existingYears, true)) {
                continue;
            }

            $pending[] = [
                'calendar_year' => $calendarYear,
                'seniority_year' => $seniorityYear,
                'entitled_days' => $rule->calculate($seniorityYear),
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
        $ruleKey = $this->resolver->resolve($employee)->key();

        return collect($this->pendingAnniversaries($employee))
            ->map(fn (array $pending) => VacationEntitlement::create([
                'employee_id' => $employee->id,
                'year' => $pending['calendar_year'],
                'entitled_days' => $pending['entitled_days'],
                'used_days' => 0,
                'rule_key' => $ruleKey,
            ]));
    }

    /**
     * Seniority years completed, the employee's next anniversary date, and
     * the label of the vacation rule currently applied to this employee.
     *
     * @return array{seniority_years: int, next_anniversary_date: ?string, active_rule_label: string}
     */
    public function summary(Employee $employee): array
    {
        $activeRuleLabel = $this->resolver->resolve($employee)->label();

        try {
            return [
                'seniority_years' => $this->seniority->completedYears($employee),
                'next_anniversary_date' => $this->seniority->nextAnniversary($employee)['date'],
                'active_rule_label' => $activeRuleLabel,
            ];
        } catch (\LogicException) {
            return [
                'seniority_years' => 0,
                'next_anniversary_date' => null,
                'active_rule_label' => $activeRuleLabel,
            ];
        }
    }
}
