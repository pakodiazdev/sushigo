<?php

namespace Database\Factories;

use App\Models\Employee;
use App\Models\OvertimeBankMovement;
use Illuminate\Database\Eloquent\Factories\Factory;

/** @extends Factory<OvertimeBankMovement> */
class OvertimeBankMovementFactory extends Factory
{
    protected $model = OvertimeBankMovement::class;

    public function definition(): array
    {
        return [
            'employee_id' => Employee::factory(),
            'attendance_id' => null,
            'date' => now()->toDateString(),
            'type' => OvertimeBankMovement::TYPE_EARNED,
            'minutes' => fake()->numberBetween(15, 120),
            'reference' => null,
            'meta' => null,
        ];
    }

    public function paid(): static
    {
        return $this->state(['type' => OvertimeBankMovement::TYPE_PAID]);
    }

    public function earned(): static
    {
        return $this->state(['type' => OvertimeBankMovement::TYPE_EARNED]);
    }
}
