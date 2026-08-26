<?php

namespace Database\Factories;

use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\Supplier>
 */
class SupplierFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'code' => 'SUP-'.fake()->unique()->numerify('#####'),
            'name' => fake()->company(),
            'contact_name' => fake()->name(),
            'email' => fake()->unique()->companyEmail(),
            'phone' => fake()->numerify('+52 55 ####-####'),
            'is_active' => true,
        ];
    }
}
