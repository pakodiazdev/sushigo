<?php

namespace Database\Factories;

use App\Models\Branch;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\Branch>
 */
class BranchFactory extends Factory
{
    protected $model = Branch::class;

    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'code' => strtoupper(fake()->unique()->lexify('BR???')),
            'name' => fake()->company().' Branch',
            'region' => fake()->randomElement(['Norte', 'Sur', 'Este', 'Oeste', 'Centro']),
            'timezone' => fake()->randomElement(['America/Mexico_City', 'America/Monterrey', 'America/Tijuana']),
            'is_active' => true,
            'meta' => [
                'address' => fake()->address(),
                'phone' => fake()->phoneNumber(),
                'manager' => fake()->name(),
            ],
        ];
    }

    /**
     * Indicate that the branch is inactive.
     */
    public function inactive(): static
    {
        return $this->state(fn (array $attributes) => [
            'is_active' => false,
        ]);
    }

    /**
     * Indicate a specific region.
     */
    public function region(string $region): static
    {
        return $this->state(fn (array $attributes) => [
            'region' => $region,
        ]);
    }
}
