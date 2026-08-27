<?php

namespace Database\Factories;

use App\Models\InventoryLocation;
use App\Models\ItemVariant;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\VariantLocationReplenishmentPolicy>
 */
class VariantLocationReplenishmentPolicyFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $min = fake()->numberBetween(0, 20);

        return [
            'inventory_location_id' => InventoryLocation::inRandomOrder()->first()?->id ?? InventoryLocation::factory(),
            'item_variant_id' => ItemVariant::inRandomOrder()->first()?->id ?? ItemVariant::factory(),
            'min_stock' => $min,
            'max_stock' => $min + fake()->numberBetween(20, 200),
            'notes' => fake()->optional()->sentence(),
            'meta' => [],
        ];
    }
}
