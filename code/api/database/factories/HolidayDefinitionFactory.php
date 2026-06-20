<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Models\HolidayDefinition;
use Illuminate\Database\Eloquent\Factories\Factory;

/** @extends Factory<HolidayDefinition> */
class HolidayDefinitionFactory extends Factory
{
    protected $model = HolidayDefinition::class;

    public function definition(): array
    {
        return [
            'name' => $this->faker->words(3, true),
            'description' => $this->faker->optional()->sentence(),
            'type' => $this->faker->randomElement(['obligatorio', 'asueto', 'opcional']),
            'pay_multiplier' => 2.00,
            'is_annual' => false,
            'recurrence_type' => 'none',
            'recurrence_config' => [],
        ];
    }

    // ── Type states ───────────────────────────────────────────────────────────

    public function obligatorio(): static
    {
        return $this->state(fn (array $attributes) => [
            'type' => 'obligatorio',
            'pay_multiplier' => 3.00,
        ]);
    }

    public function asueto(): static
    {
        return $this->state(fn (array $attributes) => [
            'type' => 'asueto',
            'pay_multiplier' => 2.00,
        ]);
    }

    public function opcional(): static
    {
        return $this->state(fn (array $attributes) => [
            'type' => 'opcional',
            'pay_multiplier' => 2.00,
        ]);
    }

    // ── Recurrence states ─────────────────────────────────────────────────────

    public function fixed(): static
    {
        return $this->state(fn (array $attributes) => [
            'recurrence_type' => 'fixed',
            'recurrence_config' => ['month' => 1, 'day' => 1],
            'is_annual' => true,
        ]);
    }

    public function nthWeekday(): static
    {
        return $this->state(fn (array $attributes) => [
            'recurrence_type' => 'nth_weekday',
            'recurrence_config' => ['month' => 2, 'week' => 1, 'weekday' => 1],
            'is_annual' => true,
        ]);
    }

    public function floating(): static
    {
        return $this->state(fn (array $attributes) => [
            'recurrence_type' => 'floating',
            'recurrence_config' => [],
            'is_annual' => true,
        ]);
    }

    // ── Annual state ──────────────────────────────────────────────────────────

    public function annual(): static
    {
        return $this->state(fn (array $attributes) => [
            'is_annual' => true,
        ]);
    }
}
