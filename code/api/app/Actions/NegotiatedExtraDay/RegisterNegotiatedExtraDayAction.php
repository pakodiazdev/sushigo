<?php

namespace App\Actions\NegotiatedExtraDay;

use App\Enums\DayStatus;
use App\Models\Attendance;
use App\Models\Employee;
use App\Models\NegotiatedExtraDay;
use App\Support\Traits\ResolvesActiveEmploymentPeriod;
use Illuminate\Validation\ValidationException;

/**
 * Register a negotiated extra day for an employee whose scheduled day is a rest day.
 *
 * This action:
 *   1. Resolves the employee from their public_id
 *   2. Guards against duplicate NegotiatedExtraDay for the same employee/date
 *   3. Resolves the branch from the employee's active employment period
 *   4. Calculates prima_amount = agreed_daily_wage * prima_percent / 100
 *   5. Creates the NegotiatedExtraDay record with status = APPROVED
 *   6. Creates or updates the Attendance record with day_status = EXTRA
 *
 * All business rule violations are surfaced as 422 ValidationException.
 */
class RegisterNegotiatedExtraDayAction
{
    use ResolvesActiveEmploymentPeriod;

    /**
     * @param  array{employee_id: string, date: string, agreed_daily_wage: float, prima_percent: float, notes: ?string}  $data
     *
     * @throws ValidationException
     */
    public function __invoke(array $data): NegotiatedExtraDay
    {
        $employee = Employee::where('public_id', $data['employee_id'])->firstOrFail();

        $this->guardNoDuplicate($employee->id, $data['date']);

        $period = $this->resolveActiveEmploymentPeriod($employee->id, $data['date']);

        $agreedDailyWage = (float) $data['agreed_daily_wage'];
        $primaPercent = (float) $data['prima_percent'];
        $primaAmount = $agreedDailyWage * $primaPercent / 100;

        $extraDay = NegotiatedExtraDay::create([
            'employee_id' => $employee->id,
            'branch_id' => $period->branch_id,
            'date' => $data['date'],
            'agreed_daily_wage' => $agreedDailyWage,
            'prima_percent' => $primaPercent,
            'prima_amount' => $primaAmount,
            'approved_by' => auth()->id(),
            'status' => NegotiatedExtraDay::STATUS_APPROVED,
            'notes' => $data['notes'] ?? null,
        ]);

        Attendance::updateOrCreate(
            ['employee_id' => $employee->id, 'date' => $data['date']],
            ['day_status' => DayStatus::EXTRA],
        );

        return $extraDay->load(['employee', 'branch', 'approvedBy']);
    }

    /**
     * Throw a 422 if a NegotiatedExtraDay already exists for this employee/date.
     *
     * @throws ValidationException
     */
    private function guardNoDuplicate(int $employeeId, string $date): void
    {
        $exists = NegotiatedExtraDay::where('employee_id', $employeeId)
            ->where('date', $date)
            ->exists();

        if ($exists) {
            throw ValidationException::withMessages([
                'date' => 'Ya existe un día extra registrado para esta fecha.',
            ]);
        }
    }
}
