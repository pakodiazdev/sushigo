<?php

namespace App\Actions\Attendances;

use App\Enums\DayStatus;
use App\Models\Attendance;
use App\Models\Employee;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * Close the day for a branch: register pending lunch returns, batch check-out,
 * and mark absences — all in a single transaction.
 *
 * Steps:
 *   1. Register lunch_end for attendances with pending lunch returns
 *   2. Register check_out for all attendances that have check_in but no check_out
 *   3. Create ABSENCE attendance records for employees with no attendance today
 *
 * Delegates individual lunch-return and check-out logic to existing actions
 * to ensure business rules (late calculations, overtime, etc.) are applied.
 *
 * @see #034, RF-12, RF-14, RF-16
 */
class CloseDayAction
{
    public function __construct(
        private RegisterLunchReturnAction $lunchReturnAction,
        private RegisterCheckOutAction $checkOutAction,
    ) {}

    /**
     * @param  array{
     *     branch_id: int,
     *     close_time: string,
     *     lunch_returns?: array<int, array{attendance_id: string, lunch_end: string}>
     * }  $data  Validated request data
     * @return array{lunch_returns: int, check_outs: int, absences: int}
     */
    public function __invoke(array $data): array
    {
        $branchId = $data['branch_id'];
        $businessTz = config('app.business_timezone');
        $today = Carbon::today($businessTz)->toDateString();

        // Build the close_time as a full ISO datetime in the business timezone
        $closeTimeLocal = Carbon::parse("{$today} {$data['close_time']}", $businessTz);
        $closeTimeIso = $closeTimeLocal->toIso8601String();

        $counts = ['lunch_returns' => 0, 'check_outs' => 0, 'absences' => 0];

        DB::transaction(function () use ($data, $branchId, $today, $closeTimeIso, &$counts) {
            // Resolve active employee IDs for this branch (used in all 3 steps)
            $activeEmployeeIds = Employee::whereHas('employmentPeriods', function ($q) use ($branchId) {
                $q->where('branch_id', $branchId)->where('is_active', true);
            })->pluck('id');

            // Step 1: Register pending lunch returns
            $lunchReturns = $data['lunch_returns'] ?? [];
            foreach ($lunchReturns as $lr) {
                $attendance = Attendance::where('public_id', $lr['attendance_id'])
                    ->whereIn('employee_id', $activeEmployeeIds)
                    ->first();

                if (! $attendance) {
                    continue;
                }

                // Build lunch_end ISO from HH:mm using the attendance date
                $lunchEndLocal = Carbon::parse(
                    "{$attendance->date->toDateString()} {$lr['lunch_end']}",
                    config('app.business_timezone')
                );

                try {
                    ($this->lunchReturnAction)($attendance, [
                        'lunch_end' => $lunchEndLocal->toIso8601String(),
                    ]);
                    $counts['lunch_returns']++;
                } catch (ValidationException) {
                    // Skip if already registered or validation fails — non-blocking
                }
            }

            // Step 2: Batch check-out for all attendances with check_in and no check_out
            // Exclude at-lunch employees (lunch_start set but lunch_end not resolved)
            $pendingCheckOuts = Attendance::whereIn('employee_id', $activeEmployeeIds)
                ->whereDate('date', $today)
                ->whereNotNull('check_in')
                ->whereNull('check_out')
                ->where(function ($q) {
                    $q->whereNull('lunch_start')
                        ->orWhereNotNull('lunch_end');
                })
                ->get();

            foreach ($pendingCheckOuts as $attendance) {
                try {
                    ($this->checkOutAction)($attendance, [
                        'check_out' => $closeTimeIso,
                    ]);
                    $counts['check_outs']++;
                } catch (ValidationException) {
                    // Skip if guard fails — non-blocking
                }
            }

            // Step 3: Mark ABSENCE for employees with no attendance record today
            $employeesWithAttendance = Attendance::whereIn('employee_id', $activeEmployeeIds)
                ->whereDate('date', $today)
                ->pluck('employee_id');

            $absentEmployeeIds = $activeEmployeeIds->diff($employeesWithAttendance);

            foreach ($absentEmployeeIds as $employeeId) {
                Attendance::create([
                    'employee_id' => $employeeId,
                    'date' => $today,
                    'day_status' => DayStatus::ABSENCE,
                ]);
                $counts['absences']++;
            }
        });

        return $counts;
    }
}
