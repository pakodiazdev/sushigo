<?php

declare(strict_types=1);

namespace Database\Seeders\Development;

use App\Models\DishCategory;
use Database\Seeders\Base\RepeatableSeeder;
use Database\Seeders\Traits\RestoresTrashedOnUpsert;

/**
 * Real dish category catalog, matching the restaurant's live menu
 * (sushigo-romita.com/menu). Category names configured in config/seeders.php
 * under development_dish_categories.
 */
class DishCategorySeeder extends RepeatableSeeder
{
    use RestoresTrashedOnUpsert;

    public function run(): void
    {
        $categories = config('seeders.development_dish_categories', []);

        foreach ($categories as $position => $name) {
            $this->upsertRestoringTrashed(
                DishCategory::class,
                ['name' => $name],
                ['position' => $position, 'is_active' => true],
            );
        }

        $this->command->info('✓ DishCategories seeded: '.count($categories));
    }
}
