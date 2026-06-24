<?php

namespace Database\Factories;

use App\Models\Employee;
use App\Models\PartialLeave;
use Illuminate\Database\Eloquent\Factories\Factory;

/** @extends Factory<PartialLeave> */
class PartialLeaveFactory extends Factory
{
    protected $model = PartialLeave::class;

    public function definition(): array
    {
        return [
            'employee_id' => Employee::factory(),
            'attendance_id' => null,
            'date' => now()->toDateString(),
            'duration_minutes' => fake()->numberBetween(30, 240),
            'is_paid' => false,
            'reason' => fake()->optional()->sentence(),
            'meta' => null,
        ];
    }

    public function paid(): static
    {
        return $this->state(['is_paid' => true]);
    }
}
