<?php

namespace App\Services;

use App\Enums\OvertimeMovementType;
use App\Models\Employee;
use App\Models\EmployeeBonusConfig;
use App\Models\EmployeeSchedule;
use App\Models\EmploymentPeriod;
use App\Models\Holiday;
use App\Models\OvertimeBankMovement;
use App\Models\PartialLeave;
use App\Models\PunctualityRange;
use App\Models\ScheduleDay;
use App\Models\WageHistory;
use Carbon\Carbon;
use Illuminate\Support\Collection;

class PayPeriodPreviewService
{
    /**
     * Build a payroll preview for a single employee over a date range.
     * Does not persist any data.
     *
     * @return array{
     *   employee: array,
     *   base_pay: float,
     *   late_deductions: float,
     *   unpaid_leave_deductions: float,
     *   overtime_pay: float,
     *   extra_day_pay: float,
     *   punctuality_bonus: float,
     *   holiday_pay: float,
     *   other_adjustments: float,
     *   total_pay: float,
     *   free_hours_earned: float,
     *   pay_period_lines: array
     * }
     */
    public function buildEmployeePreview(
        Employee $employee,
        string $periodStart,
        string $periodEnd,
        ?Collection $holidays = null,
        ?Collection $punctualityRanges = null
    ): array {
        $start = Carbon::parse($periodStart);

        // ── Load wage effective at period start ───────────────────────────────
        $wage = WageHistory::where('employee_id', $employee->id)
            ->effective($start)
            ->latest('effective_from')
            ->first();

        $hourlyRate = $wage ? (float) $wage->hourly_rate : 0.0;
        $minuteRate = $wage ? $wage->minuteRate() : 0.0;

        // ── Load WORKED attendances in the period ─────────────────────────────
        $attendances = $employee->attendances()
            ->whereBetween('date', [$periodStart, $periodEnd])
            ->where('day_status', 'WORKED')
            ->get();

        // ── Resolve scheduled minutes per worked day ──────────────────────────
        $scheduledMinutes = $this->resolveScheduledMinutes($employee, $attendances, $periodStart);

        // ── Partial leaves (linked to worked attendances) ─────────────────────
        $partialLeaves = PartialLeave::where('employee_id', $employee->id)
            ->whereBetween('date', [$periodStart, $periodEnd])
            ->get();

        // ── Overtime bank movements ───────────────────────────────────────────
        $overtimeMovements = OvertimeBankMovement::where('employee_id', $employee->id)
            ->inPeriod($periodStart, $periodEnd)
            ->get();

        // ── Negotiated extra days (APPROVED) ─────────────────────────────────
        $extraDays = $employee->negotiatedExtraDays()
            ->whereBetween('date', [$periodStart, $periodEnd])
            ->where('status', 'APPROVED')
            ->get();

        // ── Holidays in the period ────────────────────────────────────────────
        $holidays ??= Holiday::whereBetween('date', [$periodStart, $periodEnd])->get();

        // ── Punctuality bonus ─────────────────────────────────────────────────
        $bonusConfig = EmployeeBonusConfig::where('employee_id', $employee->id)
            ->effective($start)
            ->with('bonusGroup')
            ->latest('effective_from')
            ->first();

        $ranges = $punctualityRanges ?? PunctualityRange::orderBy('sort_order')->get();

        // ── Calculations ──────────────────────────────────────────────────────
        $basePay = PayrollCalculator::calculateBasePay($scheduledMinutes, $hourlyRate);
        $lateDeductions = PayrollCalculator::calculateLateDeductions($attendances, $minuteRate);
        $unpaidLeaveDeductions = PayrollCalculator::calculateUnpaidLeaveDeductions($partialLeaves, $minuteRate);
        $overtimePay = PayrollCalculator::calculateOvertimePay($overtimeMovements, $minuteRate);
        $extraDayPay = PayrollCalculator::calculateExtraDayPay($extraDays);
        $holidayPay = PayrollCalculator::calculateHolidayPay(
            $attendances,
            $holidays,
            $scheduledMinutes,
            $hourlyRate
        );
        $punctualityBonus = PunctualityService::calculateWeeklyBonusFromConfig(
            $attendances,
            $bonusConfig,
            $ranges
        );
        $freeHoursEarned = PayrollCalculator::calculateFreeHoursEarned($overtimeMovements);

        $totalPay = round(
            $basePay - $lateDeductions - $unpaidLeaveDeductions
            + $overtimePay + $extraDayPay + $punctualityBonus + $holidayPay,
            2
        );

        // ── Pay period lines ──────────────────────────────────────────────────
        $ctx = [
            'hourlyRate' => $hourlyRate,
            'minuteRate' => $minuteRate,
            'scheduledMinutes' => $scheduledMinutes,
            'periodEnd' => $periodEnd,
        ];

        $lines = $this->buildLines($attendances, $partialLeaves, $overtimeMovements, $extraDays, $holidays, $punctualityBonus, $ctx);

        return [
            'employee' => [
                'id' => $employee->public_id,
                'first_name' => $employee->first_name,
                'last_name' => $employee->last_name,
                'code' => $employee->code,
            ],
            'base_pay' => $basePay,
            'late_deductions' => $lateDeductions,
            'unpaid_leave_deductions' => $unpaidLeaveDeductions,
            'overtime_pay' => $overtimePay,
            'extra_day_pay' => $extraDayPay,
            'punctuality_bonus' => $punctualityBonus,
            'holiday_pay' => $holidayPay,
            'other_adjustments' => 0.0,
            'total_pay' => $totalPay,
            'free_hours_earned' => $freeHoursEarned,
            'pay_period_lines' => $lines,
        ];
    }

    /**
     * Resolve expected scheduled minutes for each worked attendance day.
     */
    private function resolveScheduledMinutes(Employee $employee, Collection $attendances, string $periodStart): Collection
    {
        if ($attendances->isEmpty()) {
            return collect();
        }

        $scheduleDays = $this->loadScheduleDays($employee, $periodStart);

        return $attendances->map(function ($attendance) use ($scheduleDays) {
            $dayOfWeek = Carbon::parse($attendance->date)->dayOfWeekIso;
            $scheduleDay = $scheduleDays[$dayOfWeek] ?? null;

            return $scheduleDay ? ($scheduleDay->expectedDurationMinutes() ?? 0) : 0;
        });
    }

    private function loadScheduleDays(Employee $employee, string $periodStart): Collection
    {
        $period = EmploymentPeriod::where('employee_id', $employee->id)
            ->where('is_active', true)
            ->whereDate('start_date', '<=', $periodStart)
            ->where(function ($q) use ($periodStart) {
                $q->whereNull('end_date')
                    ->orWhereDate('end_date', '>=', $periodStart);
            })
            ->first();

        $schedule = $period
            ? EmployeeSchedule::effective($periodStart)->where('employment_period_id', $period->id)->first()
            : null;

        return $schedule
            ? ScheduleDay::where('employee_schedule_id', $schedule->id)->get()->keyBy('day_of_week')
            : collect();
    }

    /**
     * Build the itemized line breakdown for this employee's period.
     *
     * @param  array{hourlyRate: float, minuteRate: float, scheduledMinutes: Collection, periodEnd: string}  $ctx
     * @return array<int, array<string, mixed>>
     */
    private function buildLines(
        Collection $attendances,
        Collection $partialLeaves,
        Collection $overtimeMovements,
        Collection $extraDays,
        Collection $holidays,
        float $punctualityBonus,
        array $ctx
    ): array {
        $lines = [];
        $holidayMap = $holidays->keyBy(fn (Holiday $h) => $h->date->toDateString());

        foreach ($attendances as $i => $attendance) {
            $lines = array_merge($lines, $this->linesForAttendance($attendance, $i, $holidayMap, $ctx));
        }

        foreach ($partialLeaves as $leave) {
            if (! $leave->is_paid) {
                $amount = round((int) $leave->duration_minutes * $ctx['minuteRate'], 2);
                $lines[] = [
                    'date' => $leave->date->toDateString(),
                    'concept' => 'UNPAID_LEAVE',
                    'description' => "Unpaid leave ({$leave->duration_minutes} min)",
                    'amount' => -$amount,
                    'minutes' => $leave->duration_minutes,
                ];
            }
        }

        foreach ($overtimeMovements as $movement) {
            if ($movement->movement_type === OvertimeMovementType::PAID) {
                $amount = round((int) $movement->minutes * $ctx['minuteRate'], 2);
                $lines[] = [
                    'date' => $movement->date->toDateString(),
                    'concept' => 'OVERTIME',
                    'description' => "Overtime paid ({$movement->minutes} min)",
                    'amount' => $amount,
                    'minutes' => $movement->minutes,
                ];
            }
        }

        foreach ($extraDays as $extraDay) {
            $lines[] = [
                'date' => $extraDay->date->toDateString(),
                'concept' => 'EXTRA_DAY',
                'description' => 'Negotiated extra day',
                'amount' => (float) $extraDay->agreed_daily_wage,
                'minutes' => null,
            ];
        }

        if ($punctualityBonus > 0) {
            $lines[] = [
                'date' => $ctx['periodEnd'],
                'concept' => 'PUNCTUALITY_BONUS',
                'description' => 'Weekly punctuality bonus',
                'amount' => $punctualityBonus,
                'minutes' => null,
            ];
        }

        return $lines;
    }

    /**
     * Build line entries for a single attendance record (BASE_PAY, LATE_DEDUCTION, HOLIDAY).
     *
     * @param  Collection<int|string, mixed>  $holidayMap
     * @param  array{hourlyRate: float, minuteRate: float, scheduledMinutes: Collection, periodEnd: string}  $ctx
     * @return array<int, array<string, mixed>>
     */
    private function linesForAttendance(mixed $attendance, int $i, Collection $holidayMap, array $ctx): array
    {
        $lines = [];
        $dateKey = is_string($attendance->date) ? $attendance->date : $attendance->date->toDateString();
        $minutes = $ctx['scheduledMinutes'][$i] ?? 0;
        $hourlyRate = $ctx['hourlyRate'];
        $minuteRate = $ctx['minuteRate'];

        $amount = round(($minutes / 60) * $hourlyRate, 2);
        if ($amount > 0) {
            $lines[] = ['date' => $dateKey, 'concept' => 'BASE_PAY', 'description' => "Base pay ({$minutes} min)", 'amount' => $amount, 'minutes' => $minutes];
        }

        $entryLate = (int) $attendance->entry_late_seconds;
        if ($entryLate > 1800) {
            $lateMin = (int) floor($entryLate / 60);
            $lines[] = ['date' => $dateKey, 'concept' => 'LATE_DEDUCTION', 'description' => "Entry late ({$lateMin} min)", 'amount' => -round($lateMin * $minuteRate, 2), 'minutes' => $lateMin];
        }

        $lunchLate = (int) $attendance->lunch_late_seconds;
        if ($lunchLate > 1800) {
            $lateMin = (int) floor($lunchLate / 60);
            $lines[] = ['date' => $dateKey, 'concept' => 'LATE_DEDUCTION', 'description' => "Lunch late ({$lateMin} min)", 'amount' => -round($lateMin * $minuteRate, 2), 'minutes' => $lateMin];
        }

        if (isset($holidayMap[$dateKey])) {
            $holiday = $holidayMap[$dateKey];
            $dailyWage = $hourlyRate * ($ctx['scheduledMinutes'][$i] ?? 0) / 60;
            $holidayExtra = round($dailyWage * ((float) $holiday->pay_multiplier - 1), 2);
            if ($holidayExtra > 0) {
                $lines[] = ['date' => $dateKey, 'concept' => 'HOLIDAY', 'description' => "Holiday: {$holiday->name}", 'amount' => $holidayExtra, 'minutes' => null];
            }
        }

        return $lines;
    }
}
