<?php

namespace App\Services;

use App\Enums\DayStatus;
use App\Enums\OvertimeMovementType;
use App\Enums\OvertimeOrigin;
use App\Enums\SeedScenario;
use App\Models\Attendance;
use App\Models\Employee;
use App\Models\OvertimeBankMovement;
use App\Models\PartialLeave;
use Carbon\Carbon;
use Carbon\CarbonPeriod;
use Illuminate\Support\Collection;
use Illuminate\Support\Str;

class PayrollSeedService
{
    // Base shift: 08:00–17:00, lunch 13:00–14:00 → 480 min net
    private const SHIFT_START = '08:00:00';

    private const SHIFT_END = '17:00:00';

    private const LUNCH_START = '13:00:00';

    private const LUNCH_END = '14:00:00';

    private const NET_MINUTES = 480;

    private const OVERTIME_END = '19:00:00'; // +2h extra

    private const LATE_SECONDS = 2100;       // 35 min late

    private const HALF_DAY_MINUTES = 240;    // 4h unpaid leave

    private const OVERTIME_MINUTES = 120;    // 2h overtime

    private const LUNCH_LATE_SECONDS = 1860; // 31 min late from lunch (> 1800s threshold)

    private const LUNCH_LATE_END = '14:31:00'; // returned 31 min late (lunch was 13:00–14:00)

    private const NET_MINUTES_LUNCH_LATE = 449; // 9h shift − 91 min actual lunch

    /**
     * @return array{ created: int, deleted: int, employees: list<string> }
     */
    public function seed(int $branchId, string $periodStart, string $periodEnd, SeedScenario $scenario): array
    {
        $employees = $this->activeEmployees($branchId);

        if ($employees->isEmpty()) {
            return ['created' => 0, 'deleted' => 0, 'employees' => []];
        }

        $employeeIds = $employees->pluck('id');

        // Reset: wipe attendances and their associated records for the period
        PartialLeave::whereIn('employee_id', $employeeIds)
            ->whereBetween('date', [$periodStart, $periodEnd])
            ->delete();

        OvertimeBankMovement::whereIn('employee_id', $employeeIds)
            ->whereBetween('date', [$periodStart, $periodEnd])
            ->delete();

        $deleted = Attendance::whereIn('employee_id', $employeeIds)
            ->whereBetween('date', [$periodStart, $periodEnd])
            ->delete();

        $weekdays = $this->weekdaysInRange($periodStart, $periodEnd);
        $now = now();
        $created = 0;

        foreach ($employees as $employeeIndex => $employee) {
            $rows = $this->buildRows($employee->id, $weekdays, $scenario, $now, $employeeIndex);

            foreach ($rows as $row) {
                $attendance = Attendance::create($row['attendance']);
                $created++;

                if ($row['partial_leave'] !== null) {
                    PartialLeave::create(array_merge($row['partial_leave'], [
                        'attendance_id' => $attendance->id,
                        'employee_id' => $employee->id,
                    ]));
                }

                if ($row['overtime'] !== null) {
                    OvertimeBankMovement::create(array_merge($row['overtime'], [
                        'attendance_id' => $attendance->id,
                        'employee_id' => $employee->id,
                        'date' => $row['attendance']['date'],
                    ]));
                }
            }
        }

        return [
            'created' => $created,
            'deleted' => $deleted,
            'employees' => $employees->pluck('code')->sort()->values()->all(),
        ];
    }

    /**
     * @return list<array{attendance: array<string, mixed>, partial_leave: array<string, mixed>|null, overtime: array<string, mixed>|null}>
     */
    private function buildRows(int $employeeId, Collection $weekdays, SeedScenario $scenario, Carbon $now, int $employeeIndex = 0): array
    {
        $rows = [];

        foreach ($weekdays as $index => $date) {
            $row = match ($scenario) {
                SeedScenario::FULL_WEEK => $this->workedRow($date),
                SeedScenario::WITH_LATES => $this->lateOrWorkedRow($date, $index),
                SeedScenario::WITH_UNPAID_LEAVE => $this->unpaidLeaveOrWorkedRow($date, $index),
                SeedScenario::WITH_OVERTIME => $this->overtimeOrWorkedRow($date, $index),
                SeedScenario::WITH_ABSENCES => $this->absenceOrWorkedRow($date, $index),
                SeedScenario::MIXED => $this->mixedRow($date, $index, $employeeIndex),
            };

            $row['attendance'] = array_merge($row['attendance'], [
                'employee_id' => $employeeId,
                'public_id' => Str::ulid()->toString(),
                'created_at' => $now,
                'updated_at' => $now,
            ]);

            $rows[] = $row;
        }

        return $rows;
    }

    /** Mon and Wed (indices 0, 2) are 35 min late. */
    private function lateOrWorkedRow(string $date, int $index): array
    {
        if (in_array($index, [0, 2], strict: true)) {
            return [
                'attendance' => [
                    'date' => $date,
                    'check_in' => $date.' 08:35:00',
                    'check_out' => $date.' '.self::SHIFT_END,
                    'lunch_start' => $date.' '.self::LUNCH_START,
                    'lunch_end' => $date.' '.self::LUNCH_END,
                    'entry_late_seconds' => self::LATE_SECONDS,
                    'lunch_late_seconds' => 0,
                    'net_worked_minutes' => self::NET_MINUTES - 35,
                    'overtime_minutes' => 0,
                    'overtime_authorized' => false,
                    'day_status' => DayStatus::WORKED->value,
                ],
                'partial_leave' => null,
                'overtime' => null,
            ];
        }

        return $this->workedRow($date);
    }

    /**
     * Thu (index 3) is a half-day unpaid leave.
     * Attendance stays WORKED so BASE_PAY is generated; PartialLeave triggers UNPAID_LEAVE deduction.
     */
    private function unpaidLeaveOrWorkedRow(string $date, int $index): array
    {
        if ($index === 3) {
            return [
                'attendance' => [
                    'date' => $date,
                    'check_in' => $date.' '.self::SHIFT_START,
                    'check_out' => $date.' 12:00:00',
                    'lunch_start' => null,
                    'lunch_end' => null,
                    'entry_late_seconds' => 0,
                    'lunch_late_seconds' => 0,
                    'net_worked_minutes' => self::HALF_DAY_MINUTES,
                    'overtime_minutes' => 0,
                    'overtime_authorized' => false,
                    'day_status' => DayStatus::WORKED->value,
                ],
                'partial_leave' => [
                    'date' => $date,
                    'duration_minutes' => self::HALF_DAY_MINUTES,
                    'is_paid' => false,
                    'reason' => 'Permiso no pagado — medio día',
                ],
                'overtime' => null,
            ];
        }

        return $this->workedRow($date);
    }

    /** Tue, Thu, Fri (indices 1, 3, 4) have 2h paid overtime. */
    private function overtimeOrWorkedRow(string $date, int $index): array
    {
        if (in_array($index, [1, 3, 4], strict: true)) {
            return [
                'attendance' => [
                    'date' => $date,
                    'check_in' => $date.' '.self::SHIFT_START,
                    'check_out' => $date.' '.self::OVERTIME_END,
                    'lunch_start' => $date.' '.self::LUNCH_START,
                    'lunch_end' => $date.' '.self::LUNCH_END,
                    'entry_late_seconds' => 0,
                    'lunch_late_seconds' => 0,
                    'net_worked_minutes' => self::NET_MINUTES + self::OVERTIME_MINUTES,
                    'overtime_minutes' => self::OVERTIME_MINUTES,
                    'overtime_authorized' => true,
                    'day_status' => DayStatus::WORKED->value,
                ],
                'partial_leave' => null,
                'overtime' => [
                    'movement_type' => OvertimeMovementType::PAID,
                    'origin' => OvertimeOrigin::AUTO,
                    'minutes' => self::OVERTIME_MINUTES,
                    'reference' => 'payroll-seed',
                ],
            ];
        }

        return $this->workedRow($date);
    }

    /** Tue and Thu (indices 1, 3) are absences. */
    private function absenceOrWorkedRow(string $date, int $index): array
    {
        if (in_array($index, [1, 3], strict: true)) {
            return [
                'attendance' => [
                    'date' => $date,
                    'check_in' => null,
                    'check_out' => null,
                    'lunch_start' => null,
                    'lunch_end' => null,
                    'entry_late_seconds' => 0,
                    'lunch_late_seconds' => 0,
                    'net_worked_minutes' => 0,
                    'overtime_minutes' => 0,
                    'overtime_authorized' => false,
                    'day_status' => DayStatus::ABSENCE->value,
                ],
                'partial_leave' => null,
                'overtime' => null,
            ];
        }

        return $this->workedRow($date);
    }

    /**
     * Each employee (by branch order) gets a distinct situation so the payroll
     * preview shows all concept types at once.
     *
     * Employee % 7 → situation:
     *   0 → Perfect week (punctual every day)
     *   1 → Late entries  (Mon 35 min, Wed 35 min)
     *   2 → Paid overtime (Tue 2 h, Fri 2 h)
     *   3 → Absences      (Tue, Thu)
     *   4 → Unpaid leave  (Thu half-day)
     *   5 → Late lunch return (Wed 30 min)
     *   6 → Combined      (Mon late + Wed overtime + Thu absent)
     */
    private function mixedRow(string $date, int $dayIndex, int $employeeIndex): array
    {
        return match ($employeeIndex % 7) {
            0 => $this->workedRow($date),
            1 => $this->lateOrWorkedRow($date, $dayIndex),
            2 => $this->overtimeOrWorkedRow($date, $dayIndex),
            3 => $this->absenceOrWorkedRow($date, $dayIndex),
            4 => $this->unpaidLeaveOrWorkedRow($date, $dayIndex),
            5 => $this->lunchLateOrWorkedRow($date, $dayIndex),
            default => $this->combinedRow($date, $dayIndex),
        };
    }

    /** Wed (index 2) returns 30 min late from lunch → lunch_late_seconds deductible. */
    private function lunchLateOrWorkedRow(string $date, int $index): array
    {
        if ($index === 2) {
            return [
                'attendance' => [
                    'date' => $date,
                    'check_in' => $date.' '.self::SHIFT_START,
                    'check_out' => $date.' '.self::SHIFT_END,
                    'lunch_start' => $date.' '.self::LUNCH_START,
                    'lunch_end' => $date.' '.self::LUNCH_LATE_END,
                    'entry_late_seconds' => 0,
                    'lunch_late_seconds' => self::LUNCH_LATE_SECONDS,
                    'net_worked_minutes' => self::NET_MINUTES_LUNCH_LATE,
                    'overtime_minutes' => 0,
                    'overtime_authorized' => false,
                    'day_status' => DayStatus::WORKED->value,
                ],
                'partial_leave' => null,
                'overtime' => null,
            ];
        }

        return $this->workedRow($date);
    }

    /**
     * Mon (0) late 35 min · Wed (2) 2 h overtime · Thu (3) absent · rest normal.
     * Combines LATE_DEDUCTION + OVERTIME + absent-day BASE_PAY gap in one employee.
     */
    private function combinedRow(string $date, int $index): array
    {
        return match ($index) {
            0 => [
                'attendance' => [
                    'date' => $date,
                    'check_in' => $date.' 08:35:00',
                    'check_out' => $date.' '.self::SHIFT_END,
                    'lunch_start' => $date.' '.self::LUNCH_START,
                    'lunch_end' => $date.' '.self::LUNCH_END,
                    'entry_late_seconds' => self::LATE_SECONDS,
                    'lunch_late_seconds' => 0,
                    'net_worked_minutes' => self::NET_MINUTES - 35,
                    'overtime_minutes' => 0,
                    'overtime_authorized' => false,
                    'day_status' => DayStatus::WORKED->value,
                ],
                'partial_leave' => null,
                'overtime' => null,
            ],
            2 => [
                'attendance' => [
                    'date' => $date,
                    'check_in' => $date.' '.self::SHIFT_START,
                    'check_out' => $date.' '.self::OVERTIME_END,
                    'lunch_start' => $date.' '.self::LUNCH_START,
                    'lunch_end' => $date.' '.self::LUNCH_END,
                    'entry_late_seconds' => 0,
                    'lunch_late_seconds' => 0,
                    'net_worked_minutes' => self::NET_MINUTES + self::OVERTIME_MINUTES,
                    'overtime_minutes' => self::OVERTIME_MINUTES,
                    'overtime_authorized' => true,
                    'day_status' => DayStatus::WORKED->value,
                ],
                'partial_leave' => null,
                'overtime' => [
                    'movement_type' => OvertimeMovementType::PAID,
                    'origin' => OvertimeOrigin::AUTO,
                    'minutes' => self::OVERTIME_MINUTES,
                    'reference' => 'payroll-seed',
                ],
            ],
            3 => [
                'attendance' => [
                    'date' => $date,
                    'check_in' => null,
                    'check_out' => null,
                    'lunch_start' => null,
                    'lunch_end' => null,
                    'entry_late_seconds' => 0,
                    'lunch_late_seconds' => 0,
                    'net_worked_minutes' => 0,
                    'overtime_minutes' => 0,
                    'overtime_authorized' => false,
                    'day_status' => DayStatus::ABSENCE->value,
                ],
                'partial_leave' => null,
                'overtime' => null,
            ],
            default => $this->workedRow($date),
        };
    }

    private function workedRow(string $date): array
    {
        return [
            'attendance' => [
                'date' => $date,
                'check_in' => $date.' '.self::SHIFT_START,
                'check_out' => $date.' '.self::SHIFT_END,
                'lunch_start' => $date.' '.self::LUNCH_START,
                'lunch_end' => $date.' '.self::LUNCH_END,
                'entry_late_seconds' => 0,
                'lunch_late_seconds' => 0,
                'net_worked_minutes' => self::NET_MINUTES,
                'overtime_minutes' => 0,
                'overtime_authorized' => false,
                'day_status' => DayStatus::WORKED->value,
            ],
            'partial_leave' => null,
            'overtime' => null,
        ];
    }

    /** Returns Mon–Fri dates within the range as Y-m-d strings, indexed from 0. */
    private function weekdaysInRange(string $periodStart, string $periodEnd): Collection
    {
        $period = CarbonPeriod::create($periodStart, $periodEnd);

        return collect($period)
            ->filter(fn (Carbon $d) => $d->isWeekday())
            ->map(fn (Carbon $d) => $d->toDateString())
            ->values();
    }

    private function activeEmployees(int $branchId): Collection
    {
        return Employee::where('is_active', true)
            ->whereHas('employmentPeriods', fn ($q) => $q
                ->where('branch_id', $branchId)
                ->where('is_active', true))
            ->orderBy('last_name')
            ->orderBy('first_name')
            ->get(['id', 'code', 'first_name', 'last_name']);
    }
}
