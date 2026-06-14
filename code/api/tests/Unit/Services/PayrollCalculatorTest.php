<?php

namespace Tests\Unit\Services;

use App\Models\Holiday;
use App\Services\PayrollCalculator;
use Carbon\Carbon;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

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

        $dailyWage = 500.0;

        // extra_pay = dailyWage × (pay_multiplier − 1) = 500 × 1 = 500
        $result = PayrollCalculator::calculateHolidayPay($attendances, $holidays, $dailyWage);

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

        $dailyWage = 500.0;

        // extra_pay = 500 × (3 − 1) = 1000
        $result = PayrollCalculator::calculateHolidayPay($attendances, $holidays, $dailyWage);

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

        $result = PayrollCalculator::calculateHolidayPay($attendances, $holidays, 500.0);

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

        $result = PayrollCalculator::calculateHolidayPay($attendances, $holidays, 500.0);

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

        $dailyWage = 400.0;

        // 2 worked holidays × 400 × 1 = 800
        $result = PayrollCalculator::calculateHolidayPay($attendances, $holidays, $dailyWage);

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

        $result = PayrollCalculator::calculateHolidayPay($attendances, $holidays, 600.0);

        $this->assertEquals(600.0, $result);
    }
}
