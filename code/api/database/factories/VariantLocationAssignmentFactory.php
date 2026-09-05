<?php

namespace Database\Factories;

use App\Models\InventoryLocation;
use App\Models\ItemVariant;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\VariantLocationAssignment>
 */
class VariantLocationAssignmentFactory extends Factory
{
    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'inventory_location_id' => InventoryLocation::factory(),
            'item_variant_id' => ItemVariant::factory(),
        ];
    }
}
