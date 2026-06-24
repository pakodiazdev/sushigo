<?php

namespace Tests\Unit\Services;

use App\Models\Holiday;
use App\Services\PayrollCalculator;
use Carbon\Carbon;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

// ── PayrollCalculator extended tests are appended at the bottom of this file ──

class PayrollCalculatorTest extends TestCase
{
    private function makeAttendance(string $date, string $dayStatus): object
    {
        return (object) [
            'date' => $date,
            'day_status' => $dayStatus,
        ];
    }

    private function makeHoliday(string $date, float $payMultiplier = 2.0): Holiday
    {
        $holiday = new Holiday;
        $holiday->date = Carbon::parse($date);
        $holiday->pay_multiplier = $payMultiplier;

        return $holiday;
    }

    // ── Happy path ────────────────────────────────────────────────────────────

    #[Test]
    public function calculates_holiday_pay_for_worked_day_on_holiday(): void
    {
        $attendances = collect([
            $this->makeAttendance('2026-01-01', 'WORKED'),
        ]);

        $holidays = collect([
            $this->makeHoliday('2026-01-01', 2.0),
        ]);

        // hourlyRate=500, scheduledMinutes=[60] → dailyWage = 500×60/60 = 500
        // extra_pay = 500 × (2 − 1) = 500
        $result = PayrollCalculator::calculateHolidayPay($attendances, $holidays, collect([60]), 500.0);

        $this->assertEquals(500.0, $result);
    }

    #[Test]
    public function uses_correct_multiplier_for_triple_pay(): void
    {
        $attendances = collect([
            $this->makeAttendance('2026-01-01', 'WORKED'),
        ]);

        $holidays = collect([
            $this->makeHoliday('2026-01-01', 3.0),
        ]);

        // hourlyRate=500, scheduledMinutes=[60] → dailyWage = 500
        // extra_pay = 500 × (3 − 1) = 1000
        $result = PayrollCalculator::calculateHolidayPay($attendances, $holidays, collect([60]), 500.0);

        $this->assertEquals(1000.0, $result);
    }

    #[Test]
    public function skips_attendance_not_on_holiday(): void
    {
        $attendances = collect([
            $this->makeAttendance('2026-01-02', 'WORKED'),
        ]);

        $holidays = collect([
            $this->makeHoliday('2026-01-01', 2.0),
        ]);

        $result = PayrollCalculator::calculateHolidayPay($attendances, $holidays, collect([60]), 500.0);

        $this->assertEquals(0.0, $result);
    }

    #[Test]
    public function skips_non_worked_status_on_holiday(): void
    {
        $attendances = collect([
            $this->makeAttendance('2026-01-01', 'DAY_OFF'),
            $this->makeAttendance('2026-01-01', 'LEAVE'),
            $this->makeAttendance('2026-01-01', 'ABSENCE'),
        ]);

        $holidays = collect([
            $this->makeHoliday('2026-01-01', 2.0),
        ]);

        $result = PayrollCalculator::calculateHolidayPay($attendances, $holidays, collect([60, 60, 60]), 500.0);

        $this->assertEquals(0.0, $result);
    }

    #[Test]
    public function accumulates_pay_for_multiple_worked_holidays(): void
    {
        $attendances = collect([
            $this->makeAttendance('2026-01-01', 'WORKED'),
            $this->makeAttendance('2026-05-01', 'WORKED'),
            $this->makeAttendance('2026-09-16', 'DAY_OFF'), // not worked
        ]);

        $holidays = collect([
            $this->makeHoliday('2026-01-01', 2.0),
            $this->makeHoliday('2026-05-01', 2.0),
            $this->makeHoliday('2026-09-16', 2.0),
        ]);

        // hourlyRate=400, scheduledMinutes=[60,60,60] → dailyWage = 400 each
        // 2 worked holidays × 400 × (2−1) = 800
        $result = PayrollCalculator::calculateHolidayPay($attendances, $holidays, collect([60, 60, 60]), 400.0);

        $this->assertEquals(800.0, $result);
    }

    #[Test]
    public function returns_zero_when_no_holidays(): void
    {
        $attendances = collect([
            $this->makeAttendance('2026-01-01', 'WORKED'),
        ]);

        $result = PayrollCalculator::calculateHolidayPay(
            $attendances,
            collect(),
            collect([60]),
            500.0
        );

        $this->assertEquals(0.0, $result);
    }

    #[Test]
    public function returns_zero_when_no_attendances(): void
    {
        $holidays = collect([
            $this->makeHoliday('2026-01-01', 2.0),
        ]);

        $result = PayrollCalculator::calculateHolidayPay(
            collect(),
            $holidays,
            collect(),
            500.0
        );

        $this->assertEquals(0.0, $result);
    }

    #[Test]
    public function handles_attendance_date_as_carbon_instance(): void
    {
        $attendance = (object) [
            'date' => Carbon::parse('2026-01-01'),
            'day_status' => 'WORKED',
        ];

        $attendances = collect([$attendance]);

        $holidays = collect([
            $this->makeHoliday('2026-01-01', 2.0),
        ]);

        // hourlyRate=600, scheduledMinutes=[60] → dailyWage = 600
        $result = PayrollCalculator::calculateHolidayPay($attendances, $holidays, collect([60]), 600.0);

        $this->assertEquals(600.0, $result);
    }

    // ── calculateBasePay ─────────────────────────────────────────────────────

    #[Test]
    public function calculates_base_pay_from_scheduled_minutes_and_hourly_rate(): void
    {
        // 3 days × 480 min each → 1440 min total
        $scheduledMinutes = collect([480, 480, 480]);
        $hourlyRate = 100.0; // 100/hr = 1.6666/min

        // base_pay = (1440 / 60) × 100 = 24 × 100 = 2400
        $result = PayrollCalculator::calculateBasePay($scheduledMinutes, $hourlyRate);

        $this->assertEquals(2400.0, $result);
    }

    #[Test]
    public function calculate_base_pay_returns_zero_for_no_worked_days(): void
    {
        $result = PayrollCalculator::calculateBasePay(collect(), 100.0);

        $this->assertEquals(0.0, $result);
    }

    // ── calculateLateDeductions ──────────────────────────────────────────────

    #[Test]
    public function deducts_entry_late_minutes_when_above_threshold(): void
    {
        // 1801 seconds = 30 min 1 sec → deductible, floor(1801/60) = 30 min
        $attendance = (object) [
            'entry_late_seconds' => 1801,
            'lunch_late_seconds' => 0,
        ];

        $minuteRate = 2.0; // $2 per minute

        $result = PayrollCalculator::calculateLateDeductions(collect([$attendance]), $minuteRate);

        $this->assertEquals(60.0, $result); // 30 min × $2
    }

    #[Test]
    public function does_not_deduct_entry_late_at_or_below_1800_seconds(): void
    {
        $attendance = (object) [
            'entry_late_seconds' => 1800,
            'lunch_late_seconds' => 0,
        ];

        $result = PayrollCalculator::calculateLateDeductions(collect([$attendance]), 2.0);

        $this->assertEquals(0.0, $result);
    }

    #[Test]
    public function deducts_lunch_late_minutes_when_above_threshold(): void
    {
        $attendance = (object) [
            'entry_late_seconds' => 0,
            'lunch_late_seconds' => 2400, // 40 min → floor = 40 min
        ];

        $result = PayrollCalculator::calculateLateDeductions(collect([$attendance]), 2.0);

        $this->assertEquals(80.0, $result); // 40 min × $2
    }

    #[Test]
    public function accumulates_both_entry_and_lunch_late_deductions(): void
    {
        $attendance = (object) [
            'entry_late_seconds' => 1900, // floor(1900/60) = 31 min
            'lunch_late_seconds' => 1900, // floor(1900/60) = 31 min
        ];

        $result = PayrollCalculator::calculateLateDeductions(collect([$attendance]), 1.0);

        $this->assertEquals(62.0, $result); // 31 + 31 = 62 min × $1
    }

    // ── calculateUnpaidLeaveDeductions ───────────────────────────────────────

    #[Test]
    public function deducts_minutes_for_unpaid_partial_leaves(): void
    {
        $leave = (object) ['duration_minutes' => 60, 'is_paid' => false];

        $result = PayrollCalculator::calculateUnpaidLeaveDeductions(collect([$leave]), 2.0);

        $this->assertEquals(120.0, $result); // 60 min × $2
    }

    #[Test]
    public function skips_paid_partial_leaves(): void
    {
        $leave = (object) ['duration_minutes' => 60, 'is_paid' => true];

        $result = PayrollCalculator::calculateUnpaidLeaveDeductions(collect([$leave]), 2.0);

        $this->assertEquals(0.0, $result);
    }

    // ── calculateOvertimePay ─────────────────────────────────────────────────

    #[Test]
    public function sums_paid_overtime_movements(): void
    {
        $movement = (object) ['type' => 'PAID', 'minutes' => 120];

        $result = PayrollCalculator::calculateOvertimePay(collect([$movement]), 2.0);

        $this->assertEquals(240.0, $result); // 120 min × $2
    }

    #[Test]
    public function skips_earned_and_expired_overtime_movements(): void
    {
        $movements = collect([
            (object) ['type' => 'EARNED', 'minutes' => 60],
            (object) ['type' => 'EXPIRED', 'minutes' => 60],
        ]);

        $result = PayrollCalculator::calculateOvertimePay($movements, 2.0);

        $this->assertEquals(0.0, $result);
    }

    // ── calculateExtraDayPay ─────────────────────────────────────────────────

    #[Test]
    public function sums_agreed_daily_wages_for_extra_days(): void
    {
        $extraDays = collect([
            (object) ['agreed_daily_wage' => 500.0],
            (object) ['agreed_daily_wage' => 750.0],
        ]);

        $result = PayrollCalculator::calculateExtraDayPay($extraDays);

        $this->assertEquals(1250.0, $result);
    }

    #[Test]
    public function calculate_extra_day_pay_returns_zero_when_empty(): void
    {
        $result = PayrollCalculator::calculateExtraDayPay(collect());

        $this->assertEquals(0.0, $result);
    }
}
