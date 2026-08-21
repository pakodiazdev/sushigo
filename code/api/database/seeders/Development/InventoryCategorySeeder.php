<?php

declare(strict_types=1);

namespace Database\Seeders\Development;

use App\Models\InventoryCategory;
use Database\Seeders\Base\RepeatableSeeder;
use Database\Seeders\Traits\RestoresTrashedOnUpsert;

/**
 * Real-world inventory taxonomy for the restaurant's small retail shelf.
 * Category names configured in config/seeders.php under
 * development_inventory_categories.
 */
class InventoryCategorySeeder extends RepeatableSeeder
{
    use RestoresTrashedOnUpsert;

    public function run(): void
    {
        $categories = config('seeders.development_inventory_categories', []);

        foreach ($categories as $position => $name) {
            $this->upsertRestoringTrashed(
                InventoryCategory::class,
                ['name' => $name],
                ['position' => $position, 'is_active' => true],
            );
        }

        $this->command->info('✓ InventoryCategories seeded: '.count($categories));
    }
}
