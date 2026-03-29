<?php

namespace Database\Factories;

use App\Models\EmployeeSchedule;
use App\Models\EmploymentPeriod;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/** @extends Factory<EmployeeSchedule> */
class EmployeeScheduleFactory extends Factory
{
    protected $model = EmployeeSchedule::class;

    public function definition(): array
    {
        $effectiveFrom = fake()->dateTimeBetween('-6 months', '-1 month');

        return [
            'public_id' => (string) Str::ulid(),
            'employment_period_id' => EmploymentPeriod::factory(),
            'effective_from' => $effectiveFrom,
            'effective_to' => null, // open-ended (current)
            'workday_type' => fake()->randomElement(['FULL', 'PARTIAL']),
            'working_days_per_week' => 6,
        ];
    }

    /**
     * A schedule that has been superseded (closed with a past effective_to).
     */
    public function closed(): static
    {
        return $this->state(function (array $attributes) {
            $from = $attributes['effective_from'];
            $to = fake()->dateTimeBetween($from, '-1 day');

            return ['effective_to' => $to];
        });
    }

    /**
     * Explicitly mark this as the currently active schedule (open-ended).
     */
    public function current(): static
    {
        return $this->state(fn () => ['effective_to' => null]);
    }

    /**
     * Full workday type — same expected times every working day.
     */
    public function full(): static
    {
        return $this->state(fn () => ['workday_type' => 'FULL']);
    }

    /**
     * Partial workday type — variable times per day (e.g., shorter Saturdays).
     */
    public function partial(): static
    {
        return $this->state(fn () => ['workday_type' => 'PARTIAL']);
    }

    /**
     * Pin the effective range to a known period for deterministic tests.
     */
    public function effectiveBetween(string $from, ?string $to = null): static
    {
        return $this->state(fn () => [
            'effective_from' => $from,
            'effective_to' => $to,
        ]);
    }

    /**
     * Override the number of working days per week.
     */
    public function withWorkingDaysPerWeek(int $days): static
    {
        return $this->state(fn () => ['working_days_per_week' => $days]);
    }
}
