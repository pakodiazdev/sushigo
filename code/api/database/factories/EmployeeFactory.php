<?php

namespace Database\Factories;

use App\Enums\EmployeeRole;
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
            'role' => fake()->randomElement(EmployeeRole::cases()),
            'is_active' => true,
            'meta' => null,
        ];
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
        return $this->state(fn(array $attributes) => [
            'role' => EmployeeRole::MANAGER,
        ]);
    }

    public function cook(): static
    {
        return $this->state(fn(array $attributes) => [
            'role' => EmployeeRole::COOK,
        ]);
    }

    public function kitchenAssistant(): static
    {
        return $this->state(fn(array $attributes) => [
            'role' => EmployeeRole::KITCHEN_ASSISTANT,
        ]);
    }

    public function deliveryDriver(): static
    {
        return $this->state(fn(array $attributes) => [
            'role' => EmployeeRole::DELIVERY_DRIVER,
        ]);
    }
}
