<?php

namespace App\Services;

use App\Enums\OvertimeMovementType;
use App\Models\Holiday;
use Illuminate\Support\Collection;

class PayrollCalculator
{
    // ── Base Pay ─────────────────────────────────────────────────────────────

    /**
     * Calculate base pay from scheduled minutes per worked day and hourly rate.
     *
     * @param  Collection<int, int>  $scheduledMinutes  Expected minutes per worked day
     */
    public static function calculateBasePay(Collection $scheduledMinutes, float $hourlyRate): float
    {
        $totalMinutes = $scheduledMinutes->sum();

        return round(($totalMinutes / 60) * $hourlyRate, 2);
    }

    // ── Late Deductions ──────────────────────────────────────────────────────

    /**
     * Calculate total late deductions for a set of attendances.
     *
     * Deducts both entry tardiness and lunch return tardiness when each exceeds
     * 1800 seconds (30 minutes). Uses floor division to convert seconds to minutes.
     *
     * @param  Collection<int, object>  $attendances  Objects with `entry_late_seconds` and `lunch_late_seconds`
     */
    public static function calculateLateDeductions(Collection $attendances, float $minuteRate): float
    {
        $total = 0.0;

        foreach ($attendances as $attendance) {
            $entryLate = (int) $attendance->entry_late_seconds;
            $lunchLate = (int) $attendance->lunch_late_seconds;

            if ($entryLate > 1800) {
                $total += floor($entryLate / 60) * $minuteRate;
            }

            if ($lunchLate > 1800) {
                $total += floor($lunchLate / 60) * $minuteRate;
            }
        }

        return round($total, 2);
    }

    // ── Unpaid Leave Deductions ──────────────────────────────────────────────

    /**
     * Calculate deductions from unpaid partial leaves.
     *
     * @param  Collection<int, object>  $partialLeaves  Objects with `duration_minutes` and `is_paid`
     */
    public static function calculateUnpaidLeaveDeductions(Collection $partialLeaves, float $minuteRate): float
    {
        $total = 0.0;

        foreach ($partialLeaves as $leave) {
            if (! $leave->is_paid) {
                $total += (int) $leave->duration_minutes * $minuteRate;
            }
        }

        return round($total, 2);
    }

    // ── Overtime Pay ─────────────────────────────────────────────────────────

    /**
     * Calculate overtime pay from PAID overtime bank movements.
     *
     * @param  Collection<int, object>  $overtimeMovements  Objects with `type` and `minutes`
     */
    public static function calculateOvertimePay(Collection $overtimeMovements, float $minuteRate): float
    {
        $total = 0.0;

        foreach ($overtimeMovements as $movement) {
            if ($movement->movement_type === OvertimeMovementType::PAID) {
                $total += (int) $movement->minutes * $minuteRate;
            }
        }

        return round($total, 2);
    }

    // ── Extra Day Pay ────────────────────────────────────────────────────────

    /**
     * Calculate pay for negotiated extra days worked (día de descanso negociado).
     *
     * @param  Collection<int, object>  $extraDays  Objects with `agreed_daily_wage`
     */
    public static function calculateExtraDayPay(Collection $extraDays): float
    {
        return round((float) $extraDays->sum('agreed_daily_wage'), 2);
    }

    // ── Free Hours Earned ────────────────────────────────────────────────────

    /**
     * Calculate free hours earned from EARNED overtime bank movements.
     *
     * @param  Collection<int, object>  $overtimeMovements
     */
    public static function calculateFreeHoursEarned(Collection $overtimeMovements): float
    {
        $minutes = 0;

        foreach ($overtimeMovements as $movement) {
            if ($movement->movement_type === OvertimeMovementType::EARNED) {
                $minutes += (int) $movement->minutes;
            }
        }

        return round($minutes / 60, 2);
    }

    /**
     * Calculate total holiday pay for a set of attendances.
     *
     * For each attendance whose date falls on a holiday AND whose day_status is WORKED,
     * the extra pay is: dailyWage × (pay_multiplier − 1).
     *
     * Per-day wages are derived from `$scheduledMinutes[$i]` and `$hourlyRate`
     * so the result matches the HOLIDAY line items in the pay-period preview,
     * even for employees whose scheduled hours vary across the week.
     *
     * @param  Collection<int, object>  $attendances  Attendance objects with `date` and `day_status`.
     * @param  Collection<int, Holiday>  $holidays  Holiday model instances.
     * @param  Collection<int, int|float>  $scheduledMinutes  Scheduled minutes per day, indexed parallel to $attendances.
     * @param  float  $hourlyRate  Employee's hourly rate (same unit as wages).
     * @return float Total holiday extra pay amount.
     */
    public static function calculateHolidayPay(
        Collection $attendances,
        Collection $holidays,
        Collection $scheduledMinutes,
        float $hourlyRate
    ): float {
        $holidayMap = $holidays->keyBy(fn (Holiday $h) => $h->date->toDateString());

        $total = 0.0;

        foreach ($attendances as $i => $attendance) {
            $dateKey = is_string($attendance->date)
                ? $attendance->date
                : $attendance->date->toDateString();

            if (! isset($holidayMap[$dateKey])) {
                continue;
            }

            if ($attendance->day_status !== 'WORKED') {
                continue;
            }

            $dailyWage = $hourlyRate * (($scheduledMinutes[$i] ?? 0) / 60);
            $multiplier = (float) $holidayMap[$dateKey]->pay_multiplier;
            $total += $dailyWage * ($multiplier - 1);
        }

        return $total;
    }
}
