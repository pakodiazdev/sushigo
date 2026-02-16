<?php

namespace Database\Factories;

use App\Models\Employee;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/** @extends Factory<Employee> */
class EmployeeFactory extends Factory
{
    protected $model = Employee::class;

    public function definition(): array
    {
        return [
            'public_id' => (string) Str::ulid(),
            'user_id' => null,
            'code' => strtoupper(fake()->unique()->bothify('EMP-###')),
            'first_name' => fake()->firstName(),
            'last_name' => fake()->lastName(),
            'is_active' => true,
            'meta' => null,
        ];
    }

    /**
     * Default: assign cook role if no role method was chained.
     *
     * When a role method (e.g. manager()) is chained, its afterCreating
     * callback runs AFTER this one and uses syncRoles() to replace roles,
     * so the default cook assignment is harmless — it gets overwritten.
     */
    public function configure(): static
    {
        return $this->afterCreating(function (Employee $employee) {
            if ($employee->roles->isEmpty()) {
                $employee->assignRole(Employee::ROLE_COOK);
            }
        });
    }

    public function withUser(?User $user = null): static
    {
        return $this->state(fn(array $attributes) => [
            'user_id' => $user?->id ?? User::factory(),
        ]);
    }

    public function inactive(): static
    {
        return $this->state(fn(array $attributes) => [
            'is_active' => false,
        ]);
    }

    public function manager(): static
    {
        return $this->afterCreating(function (Employee $employee) {
            $employee->syncRoles([Employee::ROLE_MANAGER]);
        });
    }

    public function cook(): static
    {
        return $this->afterCreating(function (Employee $employee) {
            $employee->syncRoles([Employee::ROLE_COOK]);
        });
    }

    public function kitchenAssistant(): static
    {
        return $this->afterCreating(function (Employee $employee) {
            $employee->syncRoles([Employee::ROLE_KITCHEN_ASSISTANT]);
        });
    }

    public function deliveryDriver(): static
    {
        return $this->afterCreating(function (Employee $employee) {
            $employee->syncRoles([Employee::ROLE_DELIVERY_DRIVER]);
        });
    }

    public function actingManager(): static
    {
        return $this->afterCreating(function (Employee $employee) {
            $employee->syncRoles([Employee::ROLE_ACTING_MANAGER]);
        });
    }

    public function withRoles(array $roles): static
    {
        return $this->afterCreating(function (Employee $employee) use ($roles) {
            $employee->syncRoles($roles);
        });
    }
}
