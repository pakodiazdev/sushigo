<?php

namespace Database\Factories;

use App\Models\Employee;
use App\Models\WageHistory;
use Illuminate\Database\Eloquent\Factories\Factory;

/** @extends Factory<WageHistory> */
class WageHistoryFactory extends Factory
{
    protected $model = WageHistory::class;

    public function definition(): array
    {
        $effectiveFrom = fake()->dateTimeBetween('-2 years', '-1 month');

        return [
            'employee_id'    => Employee::factory(),
            'daily_wage'     => fake()->randomFloat(2, 200, 3000),
            'effective_from' => $effectiveFrom,
            'effective_to'   => null, // open-ended (current)
        ];
    }

    /**
     * A wage record that has already been superseded (closed).
     */
    public function closed(): static
    {
        return $this->state(function (array $attributes) {
            $from = $attributes['effective_from'];
            $to   = fake()->dateTimeBetween($from, 'now');

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
     * Apply a specific daily wage amount.
     */
    public function withDailyWage(float $amount): static
    {
        return $this->state(fn () => ['daily_wage' => $amount]);
    }

    /**
     * Pin the effective range to a known period for deterministic tests.
     */
    public function effectiveBetween(string $from, ?string $to = null): static
    {
        return $this->state(fn () => [
            'effective_from' => $from,
            'effective_to'   => $to,
        ]);
    }
}
