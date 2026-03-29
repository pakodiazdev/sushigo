<?php

namespace Database\Factories;

use App\Models\EmploymentPeriod;
use App\Models\ScheduleDayOverride;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/** @extends Factory<ScheduleDayOverride> */
class ScheduleDayOverrideFactory extends Factory
{
    protected $model = ScheduleDayOverride::class;

    public function definition(): array
    {
        $effectiveFrom = fake()->dateTimeBetween('now', '+1 month');

        return [
            'public_id' => (string) Str::ulid(),
            'employment_period_id' => EmploymentPeriod::factory(),
            'day_of_week' => fake()->numberBetween(1, 7),
            'effective_from' => $effectiveFrom,
            'effective_to' => null,
            'is_day_off' => false,
            'expected_start' => '09:00',
            'expected_lunch_start' => '14:00',
            'expected_lunch_end' => '15:00',
            'lunch_duration_minutes' => 60,
            'expected_end' => '18:00',
            'note' => null,
        ];
    }

    /**
     * Single-date override (effective_from = effective_to = chosen date).
     */
    public function singleDate(string $date): static
    {
        return $this->state(fn () => [
            'effective_from' => $date,
            'effective_to' => $date,
        ]);
    }

    /**
     * Indefinite override (effective_to = null).
     */
    public function indefinite(string $from): static
    {
        return $this->state(fn () => [
            'effective_from' => $from,
            'effective_to' => null,
        ]);
    }

    /**
     * An expired override (effective_to in the past).
     */
    public function expired(): static
    {
        return $this->state(function () {
            $from = fake()->dateTimeBetween('-3 months', '-2 months');
            $to = fake()->dateTimeBetween($from, '-1 month');

            return [
                'effective_from' => $from,
                'effective_to' => $to,
            ];
        });
    }

    /**
     * Day-off override.
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
}
