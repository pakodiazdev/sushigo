<?php

namespace Database\Factories;

use App\Enums\LeaveCalculationMode;
use App\Enums\RestDayFactor;
use App\Models\LeaveType;
use Illuminate\Database\Eloquent\Factories\Factory;

/** @extends Factory<LeaveType> */
class LeaveTypeFactory extends Factory
{
    protected $model = LeaveType::class;

    public function definition(): array
    {
        return [
            'name' => fake()->words(2, true),
            'code' => strtoupper(fake()->unique()->lexify('??????????')),
            'calculation_mode' => LeaveCalculationMode::FIXED_PERCENTAGE,
            'default_pay_percentage' => 100.00,
            'default_rest_day_factor' => RestDayFactor::PROPORTIONAL,
            'counts_for_bonus' => true,
            'is_active' => true,
        ];
    }

    public function proportionalHours(): static
    {
        return $this->state(fn () => [
            'calculation_mode' => LeaveCalculationMode::PROPORTIONAL_HOURS,
        ]);
    }

    public function unpaid(): static
    {
        return $this->state(fn () => [
            'default_pay_percentage' => 0.00,
        ]);
    }
}
