<?php

namespace Database\Factories;

use App\Models\Item;
use App\Models\UnitOfMeasure;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\Item>
 */
class ItemFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'sku' => 'SKU-' . fake()->unique()->numerify('######'),
            'name' => fake()->words(3, true),
            'type' => fake()->randomElement([Item::TYPE_INSUMO, Item::TYPE_PRODUCTO, Item::TYPE_ACTIVO]),
            'is_stocked' => true,
            'is_perishable' => fake()->boolean(30),
            'is_active' => true,
            'description' => fake()->optional()->sentence(),
        ];
    }
}
