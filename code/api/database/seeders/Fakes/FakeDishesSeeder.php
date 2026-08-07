<?php

namespace Database\Seeders\Fakes;

use App\Models\Dish;
use App\Models\DishCategory;
use Illuminate\Database\Seeder;

/**
 * Generate N dish categories, each with M random dishes, via factories for
 * volume testing (pagination across many dishes/categories).
 *
 * Self-contained — creates its own categories and dishes via factories, with
 * no query against pre-existing data. Registered to run after DishesTestSeeder
 * in the `fakes-dishes` group (see TestReset::$seederGroups) only to follow the
 * Fakes-after-Testing ordering convention, not because it needs that data.
 *
 * Counts are read from config/seeders.php → factory_counts.dish_categories
 * and factory_counts.dishes_per_category.
 *
 * @see doc/conventions/testing/test-data-seeders.md (Fakes category)
 */
class FakeDishesSeeder extends Seeder
{
    public function run(): void
    {
        $categoryCount = config('seeders.factory_counts.dish_categories', 5);
        $dishesPerCategory = config('seeders.factory_counts.dishes_per_category', 8);

        $categories = DishCategory::factory($categoryCount)->create();

        foreach ($categories as $category) {
            Dish::factory($dishesPerCategory)->create([
                'dish_category_id' => $category->id,
            ]);
        }

        $this->command?->info("✓ Created {$categoryCount} fake dish categories with {$dishesPerCategory} dishes each");
    }
}
