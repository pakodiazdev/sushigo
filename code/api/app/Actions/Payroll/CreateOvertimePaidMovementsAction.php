<?php

namespace App\Actions\Payroll;

use App\Enums\OvertimeMovementType;
use App\Enums\OvertimeOrigin;
use App\Models\Employee;
use App\Models\OvertimeBankMovement;

/**
 * Create PAID overtime bank movements at payroll close time.
 *
 * For every EARNED movement in the period whose attendance overtime was authorized
 * (AP-016) and that doesn't already have a matching PAID movement, creates a PAID
 * movement reusing the valuation already computed on the Attendance row by
 * ResolveOvertimeValuationAction — there is no separate per-employee pay config.
 *
 * @see AP-038, AP-039
 */
class CreateOvertimePaidMovementsAction
{
    public function __invoke(Employee $employee, string $periodStart, string $periodEnd): void
    {
        $earnedMovements = OvertimeBankMovement::where('employee_id', $employee->id)
            ->where('movement_type', OvertimeMovementType::EARNED)
            ->whereBetween('date', [$periodStart, $periodEnd])
            ->whereHas('attendance', fn ($q) => $q->where('overtime_authorized', true))
            ->with('attendance')
            ->get();

        foreach ($earnedMovements as $movement) {
            $attendance = $movement->attendance;

            $alreadyPaid = OvertimeBankMovement::where('attendance_id', $attendance->id)
                ->where('movement_type', OvertimeMovementType::PAID)
                ->exists();

            if ($alreadyPaid) {
                continue;
            }

            OvertimeBankMovement::create([
                'employee_id' => $employee->id,
                'attendance_id' => $attendance->id,
                'date' => $attendance->date,
                'movement_type' => OvertimeMovementType::PAID,
                'origin' => OvertimeOrigin::AUTO,
                'minutes' => $movement->minutes,
                'valuation_method' => $attendance->overtime_valuation_method?->value,
                'applied_rate' => $attendance->overtime_rate_applied,
                'amount' => $attendance->overtime_amount,
                'authorized_by' => $attendance->overtime_authorized_by,
                'authorized_at' => $attendance->overtime_authorized_at,
            ]);
        }
    }
}
