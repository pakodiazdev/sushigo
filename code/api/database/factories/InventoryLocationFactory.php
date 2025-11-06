<?php

namespace Database\Factories;

use App\Models\InventoryLocation;
use App\Models\OperatingUnit;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\InventoryLocation>
 */
class InventoryLocationFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'operating_unit_id' => OperatingUnit::inRandomOrder()->first()?->id ?? OperatingUnit::factory(),
            'name' => fake()->words(2, true) . ' Warehouse',
            'type' => fake()->randomElement([
                InventoryLocation::TYPE_MAIN,
                InventoryLocation::TYPE_KITCHEN,
                InventoryLocation::TYPE_BAR,
                InventoryLocation::TYPE_WASTE,
            ]),
            'is_primary' => false,
            'is_active' => true,
            'priority' => fake()->numberBetween(0, 100),
            'notes' => fake()->optional()->sentence(),
        ];
    }
}
