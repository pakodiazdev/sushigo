<?php

namespace Database\Factories;

use App\Models\DishExtraGroup;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\DishExtraOption>
 */
class DishExtraOptionFactory extends Factory
{
    public function definition(): array
    {
        return [
            'dish_extra_group_id' => DishExtraGroup::factory(),
            'name' => fake()->words(2, true),
            'price_delta' => fake()->randomFloat(2, 0, 50),
            'is_active' => true,
            'position' => 0,
        ];
    }
}
