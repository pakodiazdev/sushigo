<?php

namespace Database\Factories;

use App\Enums\TerminationType;
use App\Models\Branch;
use App\Models\Employee;
use App\Models\EmploymentPeriod;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/** @extends Factory<EmploymentPeriod> */
class EmploymentPeriodFactory extends Factory
{
    protected $model = EmploymentPeriod::class;

    public function definition(): array
    {
        return [
            'public_id' => (string) Str::ulid(),
            'employee_id' => Employee::factory(),
            'branch_id' => Branch::factory(),
            'start_date' => fake()->dateTimeBetween('-2 years', '-1 month'),
            'end_date' => null,
            'termination_reason' => null,
            'termination_type' => null,
            'is_active' => true,
            'meta' => null,
        ];
    }

    public function inactive(): static
    {
        return $this->state(fn (array $attributes) => [
            'is_active' => false,
            'end_date' => fake()->dateTimeBetween($attributes['start_date'], 'now'),
        ]);
    }

    public function terminated(string $reason = 'Renuncia voluntaria', TerminationType $type = TerminationType::Resignation): static
    {
        return $this->state(fn (array $attributes) => [
            'is_active' => false,
            'end_date' => fake()->dateTimeBetween($attributes['start_date'], 'now'),
            'termination_reason' => $reason,
            'termination_type' => $type,
        ]);
    }

    public function internalTransfer(): static
    {
        return $this->state(fn (array $attributes) => [
            'is_active' => false,
            'end_date' => fake()->dateTimeBetween($attributes['start_date'], 'now'),
            'termination_type' => TerminationType::InternalTransfer,
        ]);
    }

    public function forEmployee(Employee $employee): static
    {
        return $this->state(fn (array $attributes) => [
            'employee_id' => $employee->id,
        ]);
    }

    public function forBranch(Branch $branch): static
    {
        return $this->state(fn (array $attributes) => [
            'branch_id' => $branch->id,
        ]);
    }
}
