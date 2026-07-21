<?php

namespace App\Services\Reports;

use App\Enums\DayStatus;
use App\Models\Attendance;
use App\Models\Employee;
use App\Models\Leave;
use Illuminate\Support\Collection;

class TodayReportService
{
    /**
     * Build employee row data from an eager-loaded Employee collection.
     *
     * Expects each Employee to have `attendances` and `leaves` loaded for today.
     *
     * @param  Collection<int, Employee>  $employees
     * @return array<int, array<string, mixed>>
     */
    public function buildEmployeeRows(Collection $employees): array
    {
        return $employees->map(function (Employee $employee) {
            $attendance = $employee->attendances->first();
            $todayLeave = $employee->leaves->first();

            $period = $employee->employmentPeriods->first();
            $scheduleDay = $period?->employeeSchedules->first()?->scheduleDays->first();
            $isScheduledOff = $scheduleDay?->is_day_off ?? false;

            $lateMinutes = $attendance
                ? (int) floor($attendance->entry_late_seconds / 60)
                : null;

            return [
                'employee_id' => $employee->public_id,
                'name' => $employee->user?->name ?? '',
                'code' => $employee->code,
                'role' => $employee->getPositionRoles()[0] ?? null,
                'status' => $this->resolveStatus($attendance, $todayLeave, $isScheduledOff),
                'check_in_time' => $attendance?->check_in?->toIso8601String(),
                'late_minutes' => $lateMinutes,
                'has_overtime' => ($attendance?->overtime_minutes ?? 0) > 0,
                'overtime_authorized' => (bool) ($attendance?->overtime_authorized ?? false),
            ];
        })->values()->all();
    }

    /**
     * Resolve the operational status for an employee.
     *
     * Priority order:
     * 1. day_off    — attendance exists with DAY_OFF status
     * 2. on_leave   — approved leave covers today
     * 3. late       — has check-in with entry_late_seconds > 0
     * 4. arrived    — has check-in with entry_late_seconds == 0
     * 5. rest_day   — no attendance/leave but schedule marks today as day off
     * 6. not_arrived — no check-in, no leave, no scheduled rest
     */
    public function resolveStatus(?Attendance $attendance, ?Leave $leave, bool $isScheduledOff = false): string
    {
        if ($attendance && $attendance->day_status === DayStatus::DAY_OFF) {
            $status = 'day_off';
        } elseif ($leave) {
            $status = 'on_leave';
        } elseif ($attendance && $attendance->check_in) {
            $status = ($attendance->entry_late_seconds ?? 0) > 0 ? 'late' : 'arrived';
        } elseif ($isScheduledOff) {
            $status = 'rest_day';
        } else {
            $status = 'not_arrived';
        }

        return $status;
    }

    /**
     * Compute summary totals from resolved employee rows.
     *
     * arrived     = employees with 'arrived' or 'late' status
     * not_arrived = employees with 'not_arrived', 'on_leave', 'day_off', or 'rest_day' status
     * late_count  = employees with 'late' status
     *
     * @param  array<int, array<string, mixed>>  $rows
     * @return array<string, int>
     */
    public function computeSummary(array $rows): array
    {
        $arrived = 0;
        $notArrived = 0;
        $lateCount = 0;

        foreach ($rows as $row) {
            $status = $row['status'];

            if ($status === 'arrived' || $status === 'late') {
                $arrived++;
            } else {
                $notArrived++; // not_arrived, on_leave, day_off, rest_day
            }

            if ($status === 'late') {
                $lateCount++;
            }
        }

        return [
            'total_employees' => count($rows),
            'arrived' => $arrived,
            'not_arrived' => $notArrived,
            'late_count' => $lateCount,
        ];
    }
}
