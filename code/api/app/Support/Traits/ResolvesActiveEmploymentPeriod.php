<?php

namespace App\Support\Traits;

use App\Models\EmploymentPeriod;
use Illuminate\Validation\ValidationException;

/**
 * Shared helper to resolve an employee's active employment period on a given date.
 *
 * Used by Actions that need to look up the branch and schedule context for
 * a specific date without duplicating the query logic.
 */
trait ResolvesActiveEmploymentPeriod
{
    /**
     * Return the active employment period for the employee on the given date.
     *
     * @throws ValidationException
     */
    private function resolveActiveEmploymentPeriod(int $employeeId, string $date): EmploymentPeriod
    {
        $period = EmploymentPeriod::where('employee_id', $employeeId)
            ->where('is_active', true)
            ->whereDate('start_date', '<=', $date)
            ->where(function ($q) use ($date) {
                $q->whereNull('end_date')
                    ->orWhereDate('end_date', '>=', $date);
            })
            ->first();

        if (! $period) {
            throw ValidationException::withMessages([
                'employee_id' => 'El empleado no tiene un período de empleo activo para esta fecha.',
            ]);
        }

        return $period;
    }
}
