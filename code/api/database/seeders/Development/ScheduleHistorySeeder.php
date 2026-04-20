<?php

namespace Database\Seeders\Development;

use App\Enums\WorkdayType;
use App\Models\Employee;
use App\Models\EmployeeSchedule;
use App\Models\EmploymentPeriod;
use App\Models\ScheduleDay;
use App\Models\ScheduleDayOverride;
use Database\Seeders\Base\OnceSeeder;

/**
 * Seed schedule history for a specific employee to test the schedule history UI.
 *
 * Creates 4 schedules for employee ADM-001 (Admin User):
 * - Schedule 1: Initial hire (2 years ago → 18 months ago) - FULL, L-V + Sáb
 * - Schedule 2: First change (18 months ago → 12 months ago) - FULL, L-V + Sáb, different lunch
 * - Schedule 3: Part-time period (12 months ago → 6 months ago) - PARTIAL, L-V only
 * - Schedule 4: Current (6 months ago → now) - FULL, L-V + Sáb
 *
 * Also creates schedule day overrides (exceptions) for testing.
 *
 * Target employee: **ADM-001 (Admin User)**
 *
 * @see Task #062
 */
class ScheduleHistorySeeder extends OnceSeeder
{
    private const TARGET_EMPLOYEE_CODE = 'ADM-001';

    // Common time constants to avoid duplication
    private const TIME_0900 = '09:00:00';

    private const TIME_1000 = '10:00:00';

    private const TIME_1300 = '13:00:00';

    private const TIME_1400 = '14:00:00';

    private const TIME_1430 = '14:30:00';

    private const TIME_1700 = '17:00:00';

    private const TIME_1730 = '17:30:00';

    private const TIME_1800 = '18:00:00';

    private const TIME_1830 = '18:30:00';

    private const TIME_1900 = '19:00:00';

    private const TIME_2000 = '20:00:00';

    private const TIME_2200 = '22:00:00';

    private const TIME_2300 = '23:00:00';

    public function run(): void
    {
        $employee = Employee::where('code', self::TARGET_EMPLOYEE_CODE)->first();

        if (! $employee) {
            $this->command->warn('⚠ Employee '.self::TARGET_EMPLOYEE_CODE.' not found, skipping ScheduleHistorySeeder');

            return;
        }

        $period = $this->getActivePeriod($employee);
        if (! $period) {
            return;
        }

        if ($this->hasExistingHistory($period->id)) {
            return;
        }

        $this->clearExistingSchedules($period->id);

        $this->command->info("📋 Creating schedule history for {$employee->code} ({$employee->full_name})...");

        $this->createScheduleHistory($period);
        $this->seedOverrides($period->id);

        $this->command->info("✅ Schedule history created for {$employee->code}: 4 schedules + overrides");
    }

    private function getActivePeriod(Employee $employee): ?EmploymentPeriod
    {
        $period = EmploymentPeriod::where('employee_id', $employee->id)
            ->where('is_active', true)
            ->first();

        if (! $period) {
            $this->command->warn('⚠ No active employment period for '.self::TARGET_EMPLOYEE_CODE.', skipping');
        }

        return $period;
    }

    private function hasExistingHistory(int $periodId): bool
    {
        $existingCount = EmployeeSchedule::where('employment_period_id', $periodId)->count();

        if ($existingCount > 1) {
            $this->command->info('⏭ Schedule history already exists for '.self::TARGET_EMPLOYEE_CODE." ({$existingCount} schedules), skipping");

            return true;
        }

        return false;
    }

    private function clearExistingSchedules(int $periodId): void
    {
        ScheduleDay::whereIn(
            'employee_schedule_id',
            EmployeeSchedule::where('employment_period_id', $periodId)->pluck('id')
        )->delete();
        EmployeeSchedule::where('employment_period_id', $periodId)->delete();
        ScheduleDayOverride::where('employment_period_id', $periodId)->delete();
    }

    private function createScheduleHistory(EmploymentPeriod $period): void
    {
        $now = now();
        $schedules = [
            // Schedule 1: Initial hire (2 years ago → 18 months ago)
            [
                'effective_from' => $now->copy()->subMonths(24)->startOfMonth()->toDateString(),
                'effective_to' => $now->copy()->subMonths(18)->endOfMonth()->toDateString(),
                'workday_type' => WorkdayType::FULL,
                'working_days_per_week' => 6,
                'shift' => [self::TIME_0900, self::TIME_1800],  // 9 AM - 6 PM
                'lunch' => [self::TIME_1300, self::TIME_1400],  // 1 PM - 2 PM (1 hour)
                'lunch_minutes' => 60,
                'rest_days' => [7],                              // Sunday only
            ],
            // Schedule 2: Changed shift (18 months ago → 12 months ago)
            [
                'effective_from' => $now->copy()->subMonths(18)->endOfMonth()->addDay()->toDateString(),
                'effective_to' => $now->copy()->subMonths(12)->endOfMonth()->toDateString(),
                'workday_type' => WorkdayType::FULL,
                'working_days_per_week' => 6,
                'shift' => [self::TIME_1000, self::TIME_1900],  // 10 AM - 7 PM
                'lunch' => [self::TIME_1400, self::TIME_1430],  // 2 PM - 2:30 PM (30 min)
                'lunch_minutes' => 30,
                'rest_days' => [7],                              // Sunday only
            ],
            // Schedule 3: Part-time period (12 months ago → 6 months ago)
            [
                'effective_from' => $now->copy()->subMonths(12)->endOfMonth()->addDay()->toDateString(),
                'effective_to' => $now->copy()->subMonths(6)->endOfMonth()->toDateString(),
                'workday_type' => WorkdayType::PARTIAL,
                'working_days_per_week' => 5,
                'shift' => [self::TIME_1400, self::TIME_2000],  // 2 PM - 8 PM (6 hours)
                'lunch' => [self::TIME_1700, self::TIME_1730],  // 5 PM - 5:30 PM (30 min)
                'lunch_minutes' => 30,
                'rest_days' => [6, 7],                           // Saturday & Sunday
            ],
            // Schedule 4: Current (6 months ago → now, open-ended)
            [
                'effective_from' => $now->copy()->subMonths(6)->endOfMonth()->addDay()->toDateString(),
                'effective_to' => null,                          // Current, open-ended
                'workday_type' => WorkdayType::FULL,
                'working_days_per_week' => 6,
                'shift' => [self::TIME_1300, self::TIME_2200],  // 1 PM - 10 PM
                'lunch' => [self::TIME_1700, self::TIME_1730],  // 5 PM - 5:30 PM (30 min)
                'lunch_minutes' => 30,
                'rest_days' => [7],                              // Sunday only
            ],
        ];

        foreach ($schedules as $index => $config) {
            $this->createScheduleWithDays($period, $config, $index);
        }
    }

    private function createScheduleWithDays(EmploymentPeriod $period, array $config, int $index): void
    {
        $schedule = EmployeeSchedule::create([
            'employment_period_id' => $period->id,
            'effective_from' => $config['effective_from'],
            'effective_to' => $config['effective_to'],
            'workday_type' => $config['workday_type'],
            'working_days_per_week' => $config['working_days_per_week'],
        ]);

        for ($dow = 1; $dow <= 7; $dow++) {
            $isRestDay = in_array($dow, $config['rest_days']);
            ScheduleDay::create([
                'employee_schedule_id' => $schedule->id,
                'day_of_week' => $dow,
                'is_day_off' => $isRestDay,
                'expected_start' => $isRestDay ? null : $config['shift'][0],
                'expected_lunch_start' => $isRestDay ? null : $config['lunch'][0],
                'expected_lunch_end' => $isRestDay ? null : $config['lunch'][1],
                'lunch_duration_minutes' => $isRestDay ? null : $config['lunch_minutes'],
                'expected_end' => $isRestDay ? null : $config['shift'][1],
            ]);
        }

        $status = $config['effective_to'] ? "cerrado ({$config['effective_to']})" : 'ACTIVO';
        $this->command->info('  ✓ Schedule #'.($index + 1).": {$config['effective_from']} → {$status}");
    }

    private function seedOverrides(int $periodId): void
    {
        $now = now();

        $overrides = [
            // Permanent override: Monday changed to later shift (indefinite)
            [
                'employment_period_id' => $periodId,
                'day_of_week' => 1,
                'effective_from' => $now->copy()->subMonths(2)->startOfMonth()->toDateString(),
                'effective_to' => null,
                'is_day_off' => false,
                'expected_start' => self::TIME_1400,
                'expected_lunch_start' => self::TIME_1800,
                'expected_lunch_end' => self::TIME_1830,
                'lunch_duration_minutes' => 30,
                'expected_end' => self::TIME_2300,
                'note' => 'Lunes con horario extendido',
            ],
            // Temporary override: Saturday off for a specific date (past)
            [
                'employment_period_id' => $periodId,
                'day_of_week' => 6,
                'effective_from' => $now->copy()->subWeeks(3)->startOfWeek()->addDays(5)->toDateString(),
                'effective_to' => $now->copy()->subWeeks(3)->startOfWeek()->addDays(5)->toDateString(),
                'is_day_off' => true,
                'expected_start' => null,
                'expected_lunch_start' => null,
                'expected_lunch_end' => null,
                'lunch_duration_minutes' => null,
                'expected_end' => null,
                'note' => 'Día libre compensatorio',
            ],
            // Temporary override: Friday with different hours (future range)
            [
                'employment_period_id' => $periodId,
                'day_of_week' => 5,
                'effective_from' => $now->copy()->addWeeks(1)->startOfWeek()->addDays(4)->toDateString(),
                'effective_to' => $now->copy()->addWeeks(2)->startOfWeek()->addDays(4)->toDateString(),
                'is_day_off' => false,
                'expected_start' => self::TIME_1000,
                'expected_lunch_start' => self::TIME_1400,
                'expected_lunch_end' => self::TIME_1430,
                'lunch_duration_minutes' => 30,
                'expected_end' => self::TIME_1900,
                'note' => 'Viernes con horario especial',
            ],
        ];

        foreach ($overrides as $override) {
            ScheduleDayOverride::create($override);
        }

        $this->command->info('  ✓ Created '.count($overrides).' schedule day overrides');
    }
}
