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
     * Default: assign cook position role to the linked User.
     * Roles live on User — Employee.syncPositionRoles() handles the sync.
     *
     * If no user was set, we create one so there's always an authenticated
     * identity to attach roles to.
     */
    public function configure(): static
    {
        return $this->afterCreating(function (Employee $employee) {
            // Ensure a User exists — roles cannot be assigned without one
            if (! $employee->user_id) {
                $user = User::factory()->create();
                $employee->user_id = $user->id;
                $employee->save();
                $employee->setRelation('user', $user);
            }

            // Default to cook if no position role was set yet
            if ($employee->getPositionRoles() === []) {
                $employee->syncPositionRoles([Employee::ROLE_COOK]);
            }
        });
    }

    public function withUser(?User $user = null): static
    {
        return $this->state(fn (array $attributes) => [
            'user_id' => $user?->id ?? User::factory(),
        ]);
    }

    public function inactive(): static
    {
        return $this->state(fn (array $attributes) => [
            'is_active' => false,
        ]);
    }

    public function manager(): static
    {
        return $this->afterCreating(function (Employee $employee) {
            $employee->syncPositionRoles([Employee::ROLE_MANAGER]);
        });
    }

    public function cook(): static
    {
        return $this->afterCreating(function (Employee $employee) {
            $employee->syncPositionRoles([Employee::ROLE_COOK]);
        });
    }

    public function kitchenAssistant(): static
    {
        return $this->afterCreating(function (Employee $employee) {
            $employee->syncPositionRoles([Employee::ROLE_KITCHEN_ASSISTANT]);
        });
    }

    public function deliveryDriver(): static
    {
        return $this->afterCreating(function (Employee $employee) {
            $employee->syncPositionRoles([Employee::ROLE_DELIVERY_DRIVER]);
        });
    }

    public function actingManager(): static
    {
        return $this->afterCreating(function (Employee $employee) {
            $employee->syncPositionRoles([Employee::ROLE_ACTING_MANAGER]);
        });
    }

    public function withRoles(array $roles): static
    {
        return $this->afterCreating(function (Employee $employee) use ($roles) {
            $employee->syncPositionRoles($roles);
        });
    }
}
