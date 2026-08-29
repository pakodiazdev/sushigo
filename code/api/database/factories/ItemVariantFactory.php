<?php

namespace Database\Factories;

use App\Models\Item;
use App\Models\UnitOfMeasure;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\ItemVariant>
 */
class ItemVariantFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'item_id' => Item::inRandomOrder()->first()?->id,
            'code' => 'VAR-'.fake()->unique()->numerify('######'),
            'name' => fake()->words(2, true),
            'uom_id' => UnitOfMeasure::inRandomOrder()->first()?->id,
            'is_active' => true,
        ];
    }
}
