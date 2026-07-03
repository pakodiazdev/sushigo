<?php

namespace Database\Seeders\Development;

use App\Enums\DayStatus;
use App\Enums\LeaveStatus;
use App\Models\EmployeeSchedule;
use App\Models\EmploymentPeriod;
use App\Models\Leave;
use App\Models\LeaveType;
use App\Models\ScheduleDayOverride;
use App\Models\User;
use App\Support\Clock\ApplicationClock;
use Carbon\Carbon;
use Database\Seeders\Base\OnceSeeder;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

/**
 * Seed a full attendance history for every non-exempt employee, spanning from
 * each of their employment periods' start_date up to yesterday (or end_date
 * for closed periods, whichever is earlier). Today is deliberately left
 * untouched so check-in, leave registration/approval and other attendance
 * flows can be exercised manually against the real system clock. Re-entry
 * employees (multiple periods) get one history block per period, with the
 * natural gap between periods left empty.
 *
 * Each working day (per the employee's effective schedule, override-aware)
 * rolls a weighted outcome:
 *   - ~78%  WORKED, mostly on time, some with a few minutes of harmless variance
 *   - ~12%  WORKED but late (5–75 min late; some cross the 30-min deductible line)
 *   - ~5%   ABSENCE (unexcused falta)
 *   - ~4%   LEAVE block (1–2 days, backed by an approved Leave — medical/personal/paid permission)
 *   - ~2%   Vacation block (3–6 days, backed by an approved Leave, paid, notes "Vacaciones")
 * Rest days (per schedule) get DAY_OFF, mirroring CloseDayAction's own
 * classification so historical data matches what the real close-day flow
 * would have produced.
 *
 * Employees marked `attendance_exempt` (e.g. admin) are skipped entirely —
 * they never appear in the attendance list, so they need no history.
 *
 * Attendance rows are bulk-inserted (bypassing model events) for performance;
 * Leave records use Eloquent since there are comparatively few of them.
 */
class AttendanceHistorySeeder extends OnceSeeder
{
    private const LATE_CHANCE = 12;       // % of working days that start late

    private const LATE_MIN_MINUTES = 5;

    private const LATE_MAX_MINUTES = 75;

    private const LUNCH_LATE_CHANCE = 8;  // % of working days with a late lunch return

    private const LUNCH_LATE_MIN_MINUTES = 5;

    private const LUNCH_LATE_MAX_MINUTES = 35;

    private const ABSENCE_CHANCE = 5;     // % of working days rolled as unexcused absence

    private const PERMISSION_CHANCE = 4;  // % of working days that start a 1–2 day leave block

    private const VACATION_CHANCE = 2;    // % of working days that start a 3–6 day vacation block

    // Fallback shift for periods with no seeded EmployeeSchedule (e.g. the factory
    // "baja" employees — EmployeeScheduleSeeder only covers active periods). Mirrors
    // EmployeeScheduleSeeder's own standard shift so history stays plausible.
    private const DEFAULT_SHIFT_START = '13:00:00';

    private const DEFAULT_SHIFT_END = '22:00:00';

    private const DEFAULT_LUNCH_START = '16:00:00';

    private const DEFAULT_LUNCH_END = '16:30:00';

    private const DEFAULT_REST_DOW = 7; // Sunday

    private const DB_DATETIME_FORMAT = 'Y-m-d H:i:s';

    private string $businessTimezone;

    private string $today;

    private ?int $adminUserId = null;

    /** @var array<string, int> LeaveType code => id */
    private array $leaveTypeIds = [];

    public function run(): void
    {
        $this->businessTimezone = config('app.business_timezone');
        $this->today = app(ApplicationClock::class)->todayInBusinessTz();

        $admin = User::whereHas('roles', fn ($q) => $q->where('name', 'admin'))->first();
        $this->adminUserId = $admin?->id;

        $this->leaveTypeIds = LeaveType::pluck('id', 'code')->all();

        $periods = EmploymentPeriod::whereHas('employee', fn ($q) => $q->where('attendance_exempt', false))
            ->with('employee')
            ->orderBy('employee_id')
            ->orderBy('start_date')
            ->get();

        if ($periods->isEmpty()) {
            $this->command->warn('⚠️  No employment periods found. Skipping AttendanceHistorySeeder.');

            return;
        }

        $totalRows = 0;
        $totalLeaves = 0;

        foreach ($periods->groupBy('employee_id') as $employeePeriods) {
            [$rows, $leaves] = $this->buildEmployeeHistory($employeePeriods);

            foreach (array_chunk($rows, 500) as $chunk) {
                DB::table('attendances')->insert($chunk);
            }

            $totalRows += count($rows);
            $totalLeaves += $leaves;
        }

        $this->command->info("✓ Seeded attendance history: {$totalRows} attendance records, {$totalLeaves} leave requests, across {$periods->pluck('employee_id')->unique()->count()} employees");
    }

    /**
     * @param  Collection<int, EmploymentPeriod>  $periods  All periods for one employee, oldest first
     * @return array{0: list<array<string, mixed>>, 1: int} [attendance rows, leave count]
     */
    private function buildEmployeeHistory(Collection $periods): array
    {
        $rows = [];
        $leaveCount = 0;
        $now = now();
        $todayCarbon = Carbon::parse($this->today);

        foreach ($periods as $period) {
            [$periodRows, $periodLeaves] = $this->buildPeriodHistory($period, $todayCarbon, $now);
            $rows = [...$rows, ...$periodRows];
            $leaveCount += $periodLeaves;
        }

        return [$rows, $leaveCount];
    }

    /**
     * Builds attendance rows for a single employment period, day by day.
     *
     * @return array{0: list<array<string, mixed>>, 1: int} [attendance rows, leave count]
     */
    private function buildPeriodHistory(EmploymentPeriod $period, Carbon $todayCarbon, Carbon $now): array
    {
        $employeeId = $period->employee_id;
        $cursor = Carbon::parse($period->start_date);

        // Never seed today — leave it untouched so check-in, leave registration and
        // other attendance flows can be exercised manually against the real clock.
        $maxSeedDate = $todayCarbon->copy()->subDay();
        $end = $period->end_date ? Carbon::parse($period->end_date) : $maxSeedDate->copy();
        if ($end->gt($maxSeedDate)) {
            $end = $maxSeedDate->copy();
        }

        if ($cursor->gt($end) || $this->periodAlreadySeeded($employeeId, $cursor, $end)) {
            return [[], 0];
        }

        $rows = [];
        $leaveCount = 0;
        $daysLeftInBlock = 0;

        while ($cursor->lte($end)) {
            $date = $cursor->toDateString();

            if ($daysLeftInBlock > 0) {
                $rows[] = $this->simpleRow($employeeId, $date, DayStatus::LEAVE, $now);
                $daysLeftInBlock--;
                $cursor->addDay();

                continue;
            }

            $scheduleDay = $this->resolveScheduleDay($date, $cursor->dayOfWeekIso, $period);

            if (! $scheduleDay) {
                $rows[] = $this->simpleRow($employeeId, $date, DayStatus::DAY_OFF, $now);
                $cursor->addDay();

                continue;
            }

            [$dayRows, $daysLeftInBlock, $leaveAdded] = $this->rollWorkingDay($employeeId, $date, $scheduleDay, $cursor, $end, $now);
            $rows = [...$rows, ...$dayRows];
            $leaveCount += $leaveAdded;

            $cursor->addDay();
        }

        return [$rows, $leaveCount];
    }

    /** Idempotency guard — true if this period's range was already seeded (e.g. re-running locally). */
    private function periodAlreadySeeded(int $employeeId, Carbon $cursor, Carbon $end): bool
    {
        return DB::table('attendances')
            ->where('employee_id', $employeeId)
            ->whereBetween('date', [$cursor->toDateString(), $end->toDateString()])
            ->exists();
    }

    /**
     * Rolls the weighted outcome for one working day: vacation/permission block,
     * unexcused absence, or a normal worked day.
     *
     * @param  array{start: string, end: string, lunch_start: ?string, lunch_end: ?string}  $scheduleDay
     * @return array{0: list<array<string, mixed>>, 1: int, 2: int} [rows, daysLeftInBlock, leaveCount added]
     */
    private function rollWorkingDay(int $employeeId, string $date, array $scheduleDay, Carbon $cursor, Carbon $end, Carbon $now): array
    {
        $roll = random_int(1, 100);
        $daysLeftInBlock = 0;
        $leaveAdded = 0;

        if ($roll <= self::VACATION_CHANCE) {
            $blockEnd = (clone $cursor)->addDays(random_int(3, 6) - 1)->min($end);
            $this->createLeave($employeeId, $date, $blockEnd->toDateString(), LeaveType::PERMISSION_PAID, 'Vacaciones');
            $rows = [$this->simpleRow($employeeId, $date, DayStatus::LEAVE, $now)];
            $daysLeftInBlock = $cursor->diffInDays($blockEnd);
            $leaveAdded = 1;
        } elseif ($roll <= self::VACATION_CHANCE + self::PERMISSION_CHANCE) {
            $blockEnd = (clone $cursor)->addDays(random_int(1, 2) - 1)->min($end);
            [$typeCode, $notes] = $this->randomPermissionType();
            $this->createLeave($employeeId, $date, $blockEnd->toDateString(), $typeCode, $notes);
            $rows = [$this->simpleRow($employeeId, $date, DayStatus::LEAVE, $now)];
            $daysLeftInBlock = $cursor->diffInDays($blockEnd);
            $leaveAdded = 1;
        } elseif ($roll <= self::VACATION_CHANCE + self::PERMISSION_CHANCE + self::ABSENCE_CHANCE) {
            $rows = [$this->simpleRow($employeeId, $date, DayStatus::ABSENCE, $now)];
        } else {
            $rows = [$this->workedRow($employeeId, $date, $scheduleDay, $now)];
        }

        return [$rows, $daysLeftInBlock, $leaveAdded];
    }

    /**
     * Resolves the effective shift times for a date within a *specific* (possibly
     * closed) employment period — mirrors ResolvesEffectiveScheduleDay, but scoped
     * to the period we already know applied on that date, so closed (re-entry)
     * periods resolve correctly too.
     *
     * Returns null on a rest day. Falls back to the company's standard shift
     * (13:00–22:00, Sunday off) when the period has no seeded EmployeeSchedule at
     * all — this happens for the factory "baja" employees, since
     * EmployeeScheduleSeeder only covers active periods.
     *
     * @return array{start: string, end: string, lunch_start: ?string, lunch_end: ?string}|null
     */
    private function resolveScheduleDay(string $date, int $dayOfWeek, EmploymentPeriod $period): ?array
    {
        $schedule = EmployeeSchedule::effective($date)
            ->where('employment_period_id', $period->id)
            ->first();

        if (! $schedule) {
            return $dayOfWeek === self::DEFAULT_REST_DOW ? null : [
                'start' => self::DEFAULT_SHIFT_START,
                'end' => self::DEFAULT_SHIFT_END,
                'lunch_start' => self::DEFAULT_LUNCH_START,
                'lunch_end' => self::DEFAULT_LUNCH_END,
            ];
        }

        $override = ScheduleDayOverride::effective($date)
            ->where('employment_period_id', $period->id)
            ->where('day_of_week', $dayOfWeek)
            ->first();

        $dayConfig = $override ?? $schedule->dayConfig($dayOfWeek);

        if (! $dayConfig || $dayConfig->is_day_off) {
            return null;
        }

        return [
            'start' => $dayConfig->expected_start->format('H:i:s'),
            'end' => $dayConfig->expected_end->format('H:i:s'),
            'lunch_start' => $dayConfig->expected_lunch_start?->format('H:i:s'),
            'lunch_end' => $dayConfig->expected_lunch_end?->format('H:i:s'),
        ];
    }

    /**
     * @return array{0: string, 1: string} [LeaveType code, notes]
     */
    private function randomPermissionType(): array
    {
        return collect([
            [LeaveType::MEDICAL, 'Incapacidad médica'],
            [LeaveType::PERSONAL, 'Permiso personal'],
            [LeaveType::PERMISSION_PAID, 'Permiso con goce de sueldo'],
        ])->random();
    }

    private function createLeave(int $employeeId, string $start, string $end, string $typeCode, string $notes): void
    {
        $typeId = $this->leaveTypeIds[$typeCode] ?? null;

        if (! $typeId || ! $this->adminUserId) {
            return;
        }

        Leave::create([
            'employee_id' => $employeeId,
            'leave_type_id' => $typeId,
            'start_date' => $start,
            'end_date' => $end,
            'status' => LeaveStatus::APPROVED,
            'requested_by' => $this->adminUserId,
            'approved_by' => $this->adminUserId,
            'approved_at' => Carbon::parse($start)->subDay(),
            'notes' => $notes,
        ]);
    }

    /**
     * A normal working day: check-in/lunch/check-out around the scheduled times, with realistic variance.
     *
     * @param  array{start: string, end: string, lunch_start: ?string, lunch_end: ?string}  $shift
     */
    private function workedRow(int $employeeId, string $date, array $shift, Carbon $now): array
    {
        $expectedStart = $shift['start'];
        $expectedEnd = $shift['end'];
        $lunchStart = $shift['lunch_start'];
        $lunchEnd = $shift['lunch_end'];

        $lateMinutes = random_int(1, 100) <= self::LATE_CHANCE
            ? random_int(self::LATE_MIN_MINUTES, self::LATE_MAX_MINUTES)
            : 0;

        $checkIn = Carbon::parse("{$date} {$expectedStart}", $this->businessTimezone)->addMinutes($lateMinutes);
        $checkOut = Carbon::parse("{$date} {$expectedEnd}", $this->businessTimezone);

        $lunchLateMinutes = ($lunchStart && $lunchEnd && random_int(1, 100) <= self::LUNCH_LATE_CHANCE)
            ? random_int(self::LUNCH_LATE_MIN_MINUTES, self::LUNCH_LATE_MAX_MINUTES)
            : 0;

        $lunchStartAt = $lunchStart ? Carbon::parse("{$date} {$lunchStart}", $this->businessTimezone) : null;
        $lunchEndAt = $lunchEnd ? Carbon::parse("{$date} {$lunchEnd}", $this->businessTimezone)->addMinutes($lunchLateMinutes) : null;

        $lunchMinutes = ($lunchStartAt && $lunchEndAt) ? $lunchStartAt->diffInMinutes($lunchEndAt) : 0;
        $netWorkedMinutes = max(0, $checkIn->diffInMinutes($checkOut) - $lunchMinutes);

        return [
            'employee_id' => $employeeId,
            'public_id' => (string) Str::ulid(),
            'date' => $date,
            'check_in' => $checkIn->clone()->utc()->format(self::DB_DATETIME_FORMAT),
            'check_out' => $checkOut->clone()->utc()->format(self::DB_DATETIME_FORMAT),
            'lunch_start' => $lunchStartAt?->clone()->utc()->format(self::DB_DATETIME_FORMAT),
            'lunch_end' => $lunchEndAt?->clone()->utc()->format(self::DB_DATETIME_FORMAT),
            'entry_late_seconds' => $lateMinutes * 60,
            'lunch_late_seconds' => $lunchLateMinutes * 60,
            'net_worked_minutes' => $netWorkedMinutes,
            'overtime_minutes' => 0,
            'overtime_authorized' => false,
            'day_status' => DayStatus::WORKED->value,
            'created_at' => $now,
            'updated_at' => $now,
        ];
    }

    /** A day with no clock events: DAY_OFF, ABSENCE, or LEAVE. */
    private function simpleRow(int $employeeId, string $date, DayStatus $status, Carbon $now): array
    {
        return [
            'employee_id' => $employeeId,
            'public_id' => (string) Str::ulid(),
            'date' => $date,
            'check_in' => null,
            'check_out' => null,
            'lunch_start' => null,
            'lunch_end' => null,
            'entry_late_seconds' => 0,
            'lunch_late_seconds' => 0,
            'net_worked_minutes' => null,
            'overtime_minutes' => 0,
            'overtime_authorized' => false,
            'day_status' => $status->value,
            'created_at' => $now,
            'updated_at' => $now,
        ];
    }
}
