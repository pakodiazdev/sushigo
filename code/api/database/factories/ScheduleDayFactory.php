<?php

namespace Database\Factories;

use App\Models\EmployeeSchedule;
use App\Models\ScheduleDay;
use Illuminate\Database\Eloquent\Factories\Factory;

/** @extends Factory<ScheduleDay> */
class ScheduleDayFactory extends Factory
{
    protected $model = ScheduleDay::class;

    public function definition(): array
    {
        return [
            'employee_schedule_id' => EmployeeSchedule::factory(),
            'day_of_week' => fake()->numberBetween(1, 7),
            'is_day_off' => false,
            'expected_start' => '08:00:00',
            'expected_lunch_start' => '13:00:00',
            'expected_lunch_end' => '14:00:00',
            'lunch_duration_minutes' => 60,
            'expected_end' => '17:00:00',
        ];
    }

    /**
     * Mark this day as a scheduled rest day (all time fields set to null).
     */
    public function dayOff(): static
    {
        return $this->state(fn () => [
            'is_day_off' => true,
            'expected_start' => null,
            'expected_lunch_start' => null,
            'expected_lunch_end' => null,
            'lunch_duration_minutes' => null,
            'expected_end' => null,
        ]);
    }

    /**
     * Mark as a regular working day (retains the default times from definition).
     */
    public function workDay(): static
    {
        return $this->state(fn () => ['is_day_off' => false]);
    }

    /**
     * Set a specific day of week.
     *
     * @param  int  $dow  ISO 8601: 1=Monday … 7=Sunday
     */
    public function onDayOfWeek(int $dow): static
    {
        return $this->state(fn () => ['day_of_week' => $dow]);
    }

    public function monday(): static
    {
        return $this->onDayOfWeek(1);
    }

    public function tuesday(): static
    {
        return $this->onDayOfWeek(2);
    }

    public function wednesday(): static
    {
        return $this->onDayOfWeek(3);
    }

    public function thursday(): static
    {
        return $this->onDayOfWeek(4);
    }

    public function friday(): static
    {
        return $this->onDayOfWeek(5);
    }

    public function saturday(): static
    {
        return $this->onDayOfWeek(6);
    }

    public function sunday(): static
    {
        return $this->onDayOfWeek(7);
    }

    /**
     * Override the expected time windows for this day.
     *
     * @param  string  $start  e.g. '09:00:00'
     * @param  string|null  $lunchStart  e.g. '13:00:00'
     * @param  string|null  $lunchEnd  e.g. '14:00:00'
     * @param  string  $end  e.g. '18:00:00'
     */
    public function withTimes(
        string $start,
        ?string $lunchStart = null,
        ?string $lunchEnd = null,
        string $end = '17:00:00',
    ): static {
        return $this->state(fn () => [
            'expected_start' => $start,
            'expected_lunch_start' => $lunchStart,
            'expected_lunch_end' => $lunchEnd,
            'expected_end' => $end,
        ]);
    }

    /**
     * Set the expected lunch break duration in minutes.
     *
     * @param  int|null  $minutes  e.g. 60. NULL disables lunch tardiness tracking.
     */
    public function withLunchDuration(?int $minutes): static
    {
        return $this->state(fn () => ['lunch_duration_minutes' => $minutes]);
    }
}
