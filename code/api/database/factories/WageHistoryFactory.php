<?php

namespace Database\Factories;

use App\Models\Employee;
use App\Models\WageHistory;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/** @extends Factory<WageHistory> */
class WageHistoryFactory extends Factory
{
    protected $model = WageHistory::class;

    public function definition(): array
    {
        $effectiveFrom = fake()->dateTimeBetween('-2 years', '-1 month');

        return [
            'public_id' => (string) Str::ulid(),
            'employee_id' => Employee::factory(),
            'hourly_rate' => fake()->randomFloat(2, 50, 500),
            'weekly_scheduled_hours' => fake()->randomElement([20.00, 24.00, 30.00, 38.00, 44.00, 48.00]),
            'effective_from' => $effectiveFrom,
            'effective_to' => null, // open-ended (current)
        ];
    }

    /**
     * A wage record that has already been superseded (closed).
     */
    public function closed(): static
    {
        return $this->state(function (array $attributes) {
            $from = $attributes['effective_from'];

            // Use '-1 day' as upper bound so effective_to is always at least
            // one day before today, guaranteeing a non-zero range even when
            // effective_from was provided as a recent date via effectiveBetween().
            $to = fake()->dateTimeBetween($from, '-1 day');

            return ['effective_to' => $to];
        });
    }

    /**
     * Explicitly mark this record as the currently active wage.
     */
    public function current(): static
    {
        return $this->state(fn () => ['effective_to' => null]);
    }

    /**
     * Apply a specific hourly rate.
     */
    public function withHourlyRate(float $amount): static
    {
        return $this->state(fn () => ['hourly_rate' => $amount]);
    }

    /**
     * Apply a specific weekly scheduled hours value.
     */
    public function withWeeklyScheduledHours(float $hours): static
    {
        return $this->state(fn () => ['weekly_scheduled_hours' => $hours]);
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
}
