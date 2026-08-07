<?php

declare(strict_types=1);

namespace Database\Seeders\Development;

use App\Models\Dish;
use App\Models\DishCategory;
use App\Models\DishExtraGroup;
use App\Models\DishExtraOption;
use Database\Seeders\Base\RepeatableSeeder;
use Database\Seeders\Traits\RestoresTrashedOnUpsert;

/**
 * Real dish catalog per category, matching the restaurant's live menu
 * (sushigo-romita.com/menu). Catalog data configured in config/seeders.php
 * under development_dishes, keyed by category name. Each dish is a compact
 * tuple: [name, description, base_price, extras?]. extras (if present) is
 * [groupName, isRequired, selectionType, options], where options is a list
 * of [optionName, priceDelta] tuples.
 *
 * A few dishes carry populated extras groups (e.g. a Ramen with a spice-level
 * group, a Roll with a sauce choice) so the extras UI has something real to
 * show immediately after seeding.
 *
 * Depends on DishCategorySeeder having already run.
 */
class DishSeeder extends RepeatableSeeder
{
    use RestoresTrashedOnUpsert;

    public function run(): void
    {
        $dishCount = 0;

        foreach (config('seeders.development_dishes', []) as $categoryName => $dishes) {
            $category = DishCategory::where('name', $categoryName)->first();

            if (! $category) {
                $this->command->warn("⚠️  DishCategory '{$categoryName}' not found. Skipping its dishes.");

                continue;
            }

            foreach ($dishes as $position => $dishTuple) {
                $dish = $this->seedDish($category, $dishTuple, $position);
                $dishCount++;

                if (isset($dishTuple[3])) {
                    $this->seedExtras($dish, $dishTuple[3]);
                }
            }
        }

        $this->command->info("✓ Dishes seeded: {$dishCount}");
    }

    private function seedDish(DishCategory $category, array $tuple, int $position): Dish
    {
        return $this->upsertRestoringTrashed(
            Dish::class,
            ['dish_category_id' => $category->id, 'name' => $tuple[0]],
            [
                'description' => $tuple[1],
                'base_price' => $tuple[2],
                'is_active' => true,
                'position' => $position,
            ],
        );
    }

    private function seedExtras(Dish $dish, array $extrasTuple): void
    {
        [$groupName, $isRequired, $selectionType, $options] = $extrasTuple;

        $group = $this->upsertRestoringTrashed(
            DishExtraGroup::class,
            ['dish_id' => $dish->id, 'name' => $groupName],
            ['is_required' => $isRequired, 'selection_type' => $selectionType],
        );

        foreach ($options as $position => [$optionName, $priceDelta]) {
            $this->upsertRestoringTrashed(
                DishExtraOption::class,
                ['dish_extra_group_id' => $group->id, 'name' => $optionName],
                ['price_delta' => $priceDelta, 'is_active' => true, 'position' => $position],
            );
        }
    }
}
