<?php

namespace Database\Seeders;

use App\Models\InventoryLocation;
use App\Models\OperatingUnit;
use Illuminate\Database\Seeder;

class InventoryLocationSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $mainUnit = OperatingUnit::where('type', OperatingUnit::TYPE_BRANCH_MAIN)->first();

        if (!$mainUnit) {
            $this->command->warn('Main operating unit not found. Please run OperatingUnitSeeder first.');
            return;
        }

        // Main storage location (primary)
        InventoryLocation::updateOrCreate(
            [
                'operating_unit_id' => $mainUnit->id,
                'type' => InventoryLocation::TYPE_MAIN,
            ],
            [
                'name' => 'Almacén Principal',
                'is_primary' => true,
                'priority' => 100,
                'meta' => [
                    'description' => 'Main warehouse storage',
                ],
            ]
        );

        // Kitchen location
        InventoryLocation::updateOrCreate(
            [
                'operating_unit_id' => $mainUnit->id,
                'type' => InventoryLocation::TYPE_KITCHEN,
            ],
            [
                'name' => 'Cocina',
                'is_primary' => false,
                'priority' => 90,
                'meta' => [
                    'description' => 'Kitchen production area',
                ],
            ]
        );

        // Bar location
        InventoryLocation::updateOrCreate(
            [
                'operating_unit_id' => $mainUnit->id,
                'type' => InventoryLocation::TYPE_BAR,
            ],
            [
                'name' => 'Barra',
                'is_primary' => false,
                'priority' => 85,
                'meta' => [
                    'description' => 'Bar and beverage area',
                ],
            ]
        );

        // Waste/scrap location
        InventoryLocation::updateOrCreate(
            [
                'operating_unit_id' => $mainUnit->id,
                'type' => InventoryLocation::TYPE_WASTE,
            ],
            [
                'name' => 'Merma y Desperdicio',
                'is_primary' => false,
                'priority' => 10,
                'meta' => [
                    'description' => 'Waste and damaged goods',
                ],
            ]
        );

        $this->command->info('✅ Inventory locations seeded successfully');
    }
}
