<?php

namespace App\Services;

use App\Enums\DayStatus;
use App\Models\Attendance;
use App\Models\Employee;
use App\Models\EmployeeBonusConfig;
use App\Models\Holiday;
use App\Models\NegotiatedExtraDay;
use App\Models\PartialLeave;
use App\Models\PunctualityRange;
use App\Models\WageHistory;
use Carbon\Carbon;
use Illuminate\Support\Collection;

class WeeklySummaryService
{
    /**
     * Build the complete financial breakdown for one employee in a period.
     * Calculates live (no closed-period snapshot required).
     *
     * @return array<string, mixed>
     */
    public function buildSummary(Employee $employee, string $periodStart, string $periodEnd): array
    {
        $attendances = Attendance::where('employee_id', $employee->id)
            ->whereBetween('date', [$periodStart, $periodEnd])
            ->with('partialLeaves')
            ->orderBy('date')
            ->get();

        $wage = WageHistory::where('employee_id', $employee->id)
            ->effective($periodStart)
            ->orderByDesc('effective_from')
            ->first();

        $hourlyRate = $wage ? (float) $wage->hourly_rate : 0.0;
        $minuteRate = $hourlyRate / 60;

        $scheduledWorkingDays = $attendances->filter(
            fn (Attendance $a) => $a->day_status !== DayStatus::DAY_OFF
        )->count();

        // Scheduled minutes per worked day with rest-day proration for calculateBasePay.
        $workedAttendances = $attendances->filter(fn (Attendance $a) => $a->day_status === DayStatus::WORKED)->values();
        $scheduledMinutesForBase = $this->buildScheduledMinutesWithRestDay($wage, $scheduledWorkingDays, $workedAttendances->count());

        // Per-attendance daily minutes (no rest-day) for calculateHolidayPay.
        // Also map to plain objects so day_status is a string, not a DayStatus enum.
        $dailyMinutes = ($wage && $scheduledWorkingDays > 0)
            ? ((float) $wage->weekly_scheduled_hours / $scheduledWorkingDays) * 60
            : 0.0;
        $attendanceDtos = $attendances->values()->map(fn (Attendance $a) => (object) [
            'date' => $a->date->toDateString(),
            'day_status' => $a->day_status->value,
        ]);
        $scheduledMinutesForHoliday = $attendances->map(fn () => $dailyMinutes)->values();

        $partialLeaves = $attendances->flatMap(fn (Attendance $a) => $a->partialLeaves);

        $extraDays = NegotiatedExtraDay::where('employee_id', $employee->id)
            ->where('status', NegotiatedExtraDay::STATUS_APPROVED)
            ->whereBetween('date', [$periodStart, $periodEnd])
            ->get();

        $holidays = Holiday::whereBetween('date', [$periodStart, $periodEnd])->get();

        // Punctuality bonus via new static API.
        $config = EmployeeBonusConfig::where('employee_id', $employee->id)
            ->effective(Carbon::parse($periodStart))
            ->orderByDesc('effective_from')
            ->with('bonusGroup')
            ->first();
        $ranges = PunctualityRange::all()->sortBy('sort_order')->values();
        $weeklyBonus = PunctualityService::calculateWeeklyBonusFromConfig($workedAttendances, $config, $ranges);

        $punctualDays = $this->countPunctualDays($attendances);
        $lastTwoPunctual = $this->lastTwoDaysPunctual($attendances);
        $freeHours = $this->calculateFreeHours($punctualDays, $lastTwoPunctual);

        $basePay = PayrollCalculator::calculateBasePay($scheduledMinutesForBase, $hourlyRate);
        $lateDeductions = PayrollCalculator::calculateLateDeductions($attendances, $minuteRate);
        $unpaidLeaveDeductions = PayrollCalculator::calculateUnpaidLeaveDeductions($partialLeaves, $minuteRate);
        $extraDayPay = PayrollCalculator::calculateExtraDayPay($extraDays);
        $holidayPay = PayrollCalculator::calculateHolidayPay($attendanceDtos, $holidays, $scheduledMinutesForHoliday, $hourlyRate);
        $overtimePay = $this->calculateOvertimePay($employee, $periodStart, $periodEnd, $minuteRate);

        $totalPay = round(
            $basePay
            - $lateDeductions
            - $unpaidLeaveDeductions
            + $extraDayPay
            + $holidayPay
            + $weeklyBonus
            + $overtimePay,
            2
        );

        $dailyEvidence = $this->buildDailyEvidence($attendances, $periodStart, $periodEnd);

        return [
            'employee_id' => $employee->public_id,
            'period_start' => $periodStart,
            'period_end' => $periodEnd,
            'base_pay' => $basePay,
            'late_deductions' => $lateDeductions,
            'unpaid_leave_deductions' => $unpaidLeaveDeductions,
            'overtime_pay' => $overtimePay,
            'extra_day_pay' => $extraDayPay,
            'holiday_pay' => $holidayPay,
            'punctuality_bonus' => $weeklyBonus,
            'free_hours_earned' => $freeHours,
            'total_pay' => $totalPay,
            'daily_evidence' => $dailyEvidence,
        ];
    }

    /**
     * Scheduled minutes per worked day, including proportional rest-day.
     *
     * Formula: (dailyHours + dailyHours/scheduledWorkingDays) × 60
     *
     * @return Collection<int, int>
     */
    private function buildScheduledMinutesWithRestDay(?WageHistory $wage, int $scheduledWorkingDays, int $workedCount): Collection
    {
        if (! $wage || $scheduledWorkingDays === 0) {
            return collect(array_fill(0, $workedCount, 0));
        }

        $dailyHours = (float) $wage->weekly_scheduled_hours / $scheduledWorkingDays;
        $effectiveMinutes = (int) round(($dailyHours + $dailyHours / $scheduledWorkingDays) * 60);

        return collect(array_fill(0, $workedCount, $effectiveMinutes));
    }

    private function countPunctualDays(Collection $attendances): int
    {
        return $attendances->filter(
            fn (Attendance $a) => $a->day_status === DayStatus::WORKED
                && ($a->entry_late_seconds ?? 0) === 0
        )->count();
    }

    private function lastTwoDaysPunctual(Collection $attendances): bool
    {
        $worked = $attendances
            ->filter(fn (Attendance $a) => $a->day_status === DayStatus::WORKED)
            ->sortByDesc('date')
            ->take(2);

        if ($worked->count() < 2) {
            return false;
        }

        return $worked->every(fn (Attendance $a) => ($a->entry_late_seconds ?? 0) === 0);
    }

    private function calculateFreeHours(int $punctualDays, bool $lastTwoDaysPunctual): float
    {
        if (! $lastTwoDaysPunctual) {
            return 0.0;
        }

        return match (true) {
            $punctualDays >= 5 => 1.0,
            $punctualDays === 4 => 0.5,
            default => 0.0,
        };
    }

    private function calculateOvertimePay(Employee $employee, string $start, string $end, float $minuteRate): float
    {
        // Sum of authorized overtime minutes × minuteRate within the period.
        // OvertimeBankMovement::PAID movements will take precedence once the bank system is live (AP-038/039).
        $authorizedOvertimeMinutes = Attendance::where('employee_id', $employee->id)
            ->whereBetween('date', [$start, $end])
            ->where('overtime_authorized', true)
            ->sum('overtime_minutes');

        return round((float) $authorizedOvertimeMinutes * $minuteRate, 2);
    }

    /** @return array<int, array<string, mixed>> */
    private function buildDailyEvidence(Collection $attendances, string $periodStart, string $periodEnd): array
    {
        $attendanceMap = $attendances->keyBy(fn (Attendance $a) => $a->date->toDateString());

        $evidence = [];
        $current = Carbon::parse($periodStart);
        $end = Carbon::parse($periodEnd);

        while ($current->lte($end)) {
            $dateStr = $current->toDateString();
            $a = $attendanceMap->get($dateStr);

            $evidence[] = $a instanceof Attendance
                ? $this->buildAttendanceRow($a, $dateStr)
                : ['date' => $dateStr, 'check_in' => null, 'check_out' => null, 'day_status' => null, 'late_minutes' => 0, 'deducted_minutes' => 0, 'partial_leaves' => [], 'overtime_minutes' => 0, 'overtime_authorized' => false];

            $current->addDay();
        }

        return $evidence;
    }

    /** @return array<string, mixed> */
    private function buildAttendanceRow(Attendance $a, string $dateStr): array
    {
        $lateMinutes = $a->entry_late_seconds ? (int) floor($a->entry_late_seconds / 60) : 0;
        $deductedMinutes = $a->isEntryLateDeductible() ? $lateMinutes : 0;
        $lunchLateMin = $a->lunch_late_seconds ? (int) floor($a->lunch_late_seconds / 60) : 0;
        if ($a->isLunchLateDeductible()) {
            $deductedMinutes += $lunchLateMin;
        }

        return [
            'date' => $dateStr,
            'check_in' => $a->check_in?->toIso8601String(),
            'check_out' => $a->check_out?->toIso8601String(),
            'day_status' => $a->day_status->value,
            'late_minutes' => $lateMinutes,
            'deducted_minutes' => $deductedMinutes,
            'partial_leaves' => $a->partialLeaves->map(fn (PartialLeave $pl) => [
                'duration_minutes' => $pl->duration_minutes,
                'is_paid' => $pl->is_paid,
            ])->values()->all(),
            'overtime_minutes' => $a->overtime_minutes ?? 0,
            'overtime_authorized' => (bool) ($a->overtime_authorized ?? false),
        ];
    }
}
