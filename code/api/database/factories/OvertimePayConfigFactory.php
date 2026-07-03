<?php

namespace Database\Factories;

use App\Models\Employee;
use App\Models\OvertimePayConfig;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/** @extends Factory<OvertimePayConfig> */
class OvertimePayConfigFactory extends Factory
{
    protected $model = OvertimePayConfig::class;

    public function definition(): array
    {
        $effectiveFrom = fake()->dateTimeBetween('-2 years', '-1 month');

        return [
            'public_id' => (string) Str::ulid(),
            'employee_id' => Employee::factory(),
            'valuation_method' => 'LFT_PROPORTIONAL',
            'lft_factor' => fake()->randomElement(['2.00', '3.00']),
            'hourly_rate' => null,
            'effective_from' => $effectiveFrom,
            'effective_to' => null, // open-ended (current)
        ];
    }

    /**
     * Configure this record as an agreed hourly rate config instead of LFT proportional.
     */
    public function agreedRate(float $hourlyRate = 90.00): static
    {
        return $this->state(fn () => [
            'valuation_method' => 'AGREED_RATE',
            'lft_factor' => null,
            'hourly_rate' => $hourlyRate,
        ]);
    }

    /**
     * A config that has already been superseded (closed).
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
     * Explicitly mark this record as the currently active config.
     */
    public function current(): static
    {
        return $this->state(fn () => ['effective_to' => null]);
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
