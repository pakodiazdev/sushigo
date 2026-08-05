<?php

namespace Database\Factories;

use App\Models\Dish;
use App\Models\DishExtraGroup;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\DishExtraGroup>
 */
class DishExtraGroupFactory extends Factory
{
    public function definition(): array
    {
        return [
            'dish_id' => Dish::factory(),
            'name' => fake()->words(2, true),
            'is_required' => false,
            'selection_type' => fake()->randomElement([DishExtraGroup::SELECTION_SINGLE, DishExtraGroup::SELECTION_MULTIPLE]),
        ];
    }
}
