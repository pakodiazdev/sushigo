<?php

namespace Database\Factories;

use App\Enums\OvertimeMovementType;
use App\Enums\OvertimeOrigin;
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
            'movement_type' => OvertimeMovementType::EARNED,
            'origin' => OvertimeOrigin::AUTO,
            'minutes' => fake()->numberBetween(15, 120),
            'valuation_method' => null,
            'applied_rate' => null,
            'amount' => null,
            'authorized_by' => null,
            'authorized_at' => null,
            'reason' => null,
            'reference' => null,
            'meta' => null,
        ];
    }

    public function paid(): static
    {
        return $this->state(['movement_type' => OvertimeMovementType::PAID]);
    }

    public function earned(): static
    {
        return $this->state(['movement_type' => OvertimeMovementType::EARNED]);
    }
}
