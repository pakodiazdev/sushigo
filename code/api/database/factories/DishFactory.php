<?php

namespace Database\Factories;

use App\Models\DishCategory;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\Dish>
 */
class DishFactory extends Factory
{
    public function definition(): array
    {
        return [
            'dish_category_id' => DishCategory::factory(),
            'name' => fake()->words(3, true),
            'description' => fake()->optional()->sentence(),
            'base_price' => fake()->randomFloat(2, 30, 300),
            'is_active' => true,
            'position' => 0,
        ];
    }
}
