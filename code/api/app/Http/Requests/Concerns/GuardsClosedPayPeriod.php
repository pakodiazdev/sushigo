<?php

namespace App\Http\Requests\Concerns;

use App\Actions\Payroll\EnsurePeriodIsEditableAction;
use App\Models\Employee;
use App\Models\EmploymentPeriod;
use Carbon\Carbon;
use Illuminate\Validation\Validator;
use Throwable;

/**
 * Shared guard for FormRequests that write attendance/payroll-input data:
 * rejects the write when the target branch + date already falls inside a
 * CLOSED PayPeriod (see issue #251).
 */
trait GuardsClosedPayPeriod
{
    /**
     * Register a validator->after() check blocking the request when any of
     * the given dates falls inside a CLOSED PayPeriod. The branch is resolved
     * per date from the employee's employment period covering that date, so
     * a branch transfer mid-request is checked against the correct branch.
     *
     * @param  string|array<int, string|null>|null  $dates
     */
    protected function guardClosedPeriod(Validator $validator, ?int $employeeId, string|array|null $dates, string $field = 'date'): void
    {
        $validator->after(function (Validator $v) use ($employeeId, $dates, $field) {
            if ($employeeId && $this->hasDateInClosedPeriod($employeeId, $dates)) {
                $v->errors()->add($field, 'No se puede modificar un registro dentro de un periodo de nómina ya cerrado. Reabra el periodo primero.');
            }
        });
    }

    /**
     * @param  string|array<int, string|null>|null  $dates
     */
    private function hasDateInClosedPeriod(int $employeeId, string|array|null $dates): bool
    {
        $action = app(EnsurePeriodIsEditableAction::class);

        foreach ((array) $dates as $date) {
            $normalized = $this->normalizeDate($date);
            $branchId = $normalized ? $this->branchIdForEmployeeOnDate($employeeId, $normalized) : null;

            if ($branchId && ! $action($branchId, $normalized)) {
                return true;
            }
        }

        return false;
    }

    private function normalizeDate(mixed $date): ?string
    {
        if (! $date) {
            return null;
        }

        try {
            return Carbon::parse($date)->toDateString();
        } catch (Throwable) {
            return null;
        }
    }

    /**
     * Resolve an employee's internal id from their public_id.
     */
    protected function employeeIdFromPublicId(?string $employeePublicId): ?int
    {
        if (! $employeePublicId) {
            return null;
        }

        return Employee::where('public_id', $employeePublicId)->value('id');
    }

    /**
     * Resolve the branch of the employment period that actually covers the
     * given date — active or not — so the lock still applies to a terminated
     * or transferred employee's final pay adjustments. Filtering by
     * is_active would miss the period entirely once it's closed out
     * (end_date set, is_active=false), silently bypassing the guard.
     */
    protected function branchIdForEmployeeOnDate(int $employeeId, string $date): ?int
    {
        return EmploymentPeriod::where('employee_id', $employeeId)
            ->where('start_date', '<=', $date)
            ->where(function ($q) use ($date) {
                $q->whereNull('end_date')->orWhere('end_date', '>=', $date);
            })
            ->orderByDesc('start_date')
            ->value('branch_id');
    }
}
