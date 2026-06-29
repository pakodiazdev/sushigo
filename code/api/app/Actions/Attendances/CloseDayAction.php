<?php

namespace App\Actions\Attendances;

use App\Enums\DayStatus;
use App\Enums\LeaveStatus;
use App\Models\Attendance;
use App\Models\Employee;
use App\Models\EmployeeSchedule;
use App\Models\EmploymentPeriod;
use App\Models\Leave;
use App\Models\ScheduleDayOverride;
use App\Support\Clock\ApplicationClock;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * Close the day for a branch: register pending lunch returns, batch check-out,
 * and auto-classify employees with no attendance — all in a single transaction.
 *
 * Steps:
 *   1. Register lunch_end for attendances with pending lunch returns
 *   2. Register check_out for all attendances that have check_in but no check_out
 *   3. For each employee with no attendance record today, resolve their day status:
 *        a. Approved leave covering today  → LEAVE
 *        b. Schedule marks today as rest day → DAY_OFF
 *        c. Otherwise                        → ABSENCE
 *
 * Delegates individual lunch-return and check-out logic to existing actions
 * to ensure business rules (late calculations, overtime, etc.) are applied.
 *
 * @see #034, #055, RF-12, RF-14, RF-16
 */
class CloseDayAction
{
    public function __construct(
        private readonly ApplicationClock $clock,
        private RegisterLunchReturnAction $lunchReturnAction,
        private RegisterCheckOutAction $checkOutAction,
    ) {}

    /**
     * @param  array{
     *     branch_id: int,
     *     close_time: string,
     *     lunch_returns?: array<int, array{attendance_id: string, lunch_end: string}>
     * }  $data  Validated request data
     * @return array{
     *     lunch_returns: int,
     *     check_outs: int,
     *     absences: int,
     *     leaves: int,
     *     day_offs: int,
     *     overtime_pending: array<int, array{attendance_id: string, employee_name: string, overtime_minutes: int}>
     * }
     */
    public function __invoke(array $data): array
    {
        $branchId = $data['branch_id'];
        $today = $this->clock->todayInBusinessTz();
        $dayOfWeek = $this->clock->nowInBusinessTz()->dayOfWeekIso;

        // Build the close_time as a full ISO datetime in the business timezone
        $closeTimeLocal = Carbon::parse("{$today} {$data['close_time']}", $this->clock->businessTimezone());
        $closeTimeIso = $closeTimeLocal->toIso8601String();

        $counts = ['lunch_returns' => 0, 'check_outs' => 0, 'absences' => 0, 'leaves' => 0, 'day_offs' => 0, 'overtime_pending' => []];

        DB::transaction(function () use ($data, $branchId, $today, $dayOfWeek, $closeTimeIso, &$counts) {
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

            // Collect attendances that now have overtime with no decision recorded yet.
            // These will be returned so the caller can prompt the manager for each one.
            $counts['overtime_pending'] = Attendance::whereIn('employee_id', $activeEmployeeIds)
                ->whereDate('date', $today)
                ->where('overtime_minutes', '>', 0)
                ->whereNull('overtime_authorized_at')
                ->with('employee')
                ->get()
                ->map(fn (Attendance $a) => [
                    'attendance_id' => $a->public_id,
                    'employee_name' => "{$a->employee->first_name} {$a->employee->last_name}",
                    'overtime_minutes' => $a->overtime_minutes,
                ])
                ->values()
                ->all();

            // Step 3: Classify employees with no attendance record today
            $employeesWithAttendance = Attendance::whereIn('employee_id', $activeEmployeeIds)
                ->whereDate('date', $today)
                ->pluck('employee_id');

            $noAttendanceIds = $activeEmployeeIds->diff($employeesWithAttendance);

            foreach ($noAttendanceIds as $employeeId) {
                $dayStatus = $this->resolveAbsentDayStatus($employeeId, $today, $dayOfWeek);

                Attendance::create([
                    'employee_id' => $employeeId,
                    'date' => $today,
                    'day_status' => $dayStatus,
                ]);

                match ($dayStatus) {
                    DayStatus::LEAVE => $counts['leaves']++,
                    DayStatus::DAY_OFF => $counts['day_offs']++,
                    default => $counts['absences']++,
                };
            }
        });

        return $counts;
    }

    /**
     * Determine the appropriate DayStatus for an employee who has no attendance today.
     *
     * Priority:
     *   1. Approved leave covering today  → LEAVE
     *   2. Schedule rest day              → DAY_OFF
     *   3. Default                        → ABSENCE
     */
    private function resolveAbsentDayStatus(int $employeeId, string $today, int $dayOfWeek): DayStatus
    {
        // 1. Approved leave covering today
        $hasApprovedLeave = Leave::where('employee_id', $employeeId)
            ->where('status', LeaveStatus::APPROVED)
            ->whereDate('start_date', '<=', $today)
            ->whereDate('end_date', '>=', $today)
            ->exists();

        if ($hasApprovedLeave) {
            return DayStatus::LEAVE;
        }

        // 2. Schedule rest day (override-aware, mirrors ResolvesEffectiveScheduleDay logic)
        if ($this->isScheduledRestDay($employeeId, $today, $dayOfWeek)) {
            return DayStatus::DAY_OFF;
        }

        return DayStatus::ABSENCE;
    }

    /**
     * Returns true if the employee's effective schedule marks today as a rest day.
     *
     * Resolution order (same as ResolvesEffectiveScheduleDay trait):
     *   1. Active employment period covering today
     *   2. Effective EmployeeSchedule for that period
     *   3. ScheduleDayOverride for today → if is_day_off, rest day
     *   4. Base ScheduleDay for today's day of week → if is_day_off, rest day
     *
     * Returns false (defaults to ABSENCE) when the period or schedule cannot be resolved.
     */
    private function isScheduledRestDay(int $employeeId, string $today, int $dayOfWeek): bool
    {
        $period = EmploymentPeriod::where('employee_id', $employeeId)
            ->where('is_active', true)
            ->whereDate('start_date', '<=', $today)
            ->where(function ($q) use ($today) {
                $q->whereNull('end_date')
                    ->orWhereDate('end_date', '>=', $today);
            })
            ->first();

        if (! $period) {
            return false;
        }

        $schedule = EmployeeSchedule::effective($today)
            ->where('employment_period_id', $period->id)
            ->first();

        if (! $schedule) {
            return false;
        }

        // Override takes precedence
        $override = ScheduleDayOverride::effective($today)
            ->where('employment_period_id', $period->id)
            ->where('day_of_week', $dayOfWeek)
            ->first();

        if ($override) {
            return $override->is_day_off;
        }

        // Fall back to base ScheduleDay
        $scheduleDay = $schedule->dayConfig($dayOfWeek);

        return $scheduleDay?->isDayOff() ?? false;
    }
}
