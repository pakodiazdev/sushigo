<?php

namespace Database\Seeders\Testing;

use App\Models\DishExtraGroup;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

/**
 * Dishes test seeder — deterministic Platillos catalog for Cypress/PHPUnit.
 *
 * Creates 2 categories and 3 dishes, one per extras configuration shape:
 * no extras, a single-required group, and a multiple-optional group.
 *
 * No idempotency checks — always starts from truncated tables.
 * Optimized for speed: bulk DB::table()->insert(), no Eloquent events.
 * ULIDs generated manually for models that use HasPublicId.
 */
class DishesTestSeeder extends Seeder
{
    public function run(): void
    {
        $now = now();

        $categoryIds = $this->seedCategories($now);
        $dishIds = $this->seedDishes($categoryIds, $now);
        $this->seedExtras($dishIds, $now);
    }

    /**
     * @return array<string, int> category name => id
     */
    private function seedCategories($now): array
    {
        DB::table('dish_categories')->insert([
            $this->categoryRow('Rollos', 0, $now),
            $this->categoryRow('Ramen', 1, $now),
        ]);

        return DB::table('dish_categories')->pluck('id', 'name')->toArray();
    }

    /**
     * @param  array<string, int>  $categoryIds
     * @return array<string, int> dish name => id
     */
    private function seedDishes(array $categoryIds, $now): array
    {
        DB::table('dishes')->insert([
            $this->dishRow($categoryIds['Rollos'], 'California Roll', 'Aguacate, pepino y surimi envueltos en arroz y alga nori.', 120.00, 0, $now),
            $this->dishRow($categoryIds['Ramen'], 'Tonkotsu Ramen', 'Caldo cremoso de cerdo, chashu, huevo marinado y cebollín.', 145.00, 0, $now),
            $this->dishRow($categoryIds['Rollos'], 'Spicy Tuna Roll', 'Atún picante, cebollín y ajonjolí envueltos en arroz y alga nori.', 135.00, 1, $now),
        ]);

        return DB::table('dishes')->pluck('id', 'name')->toArray();
    }

    /**
     * @param  array<string, int>  $dishIds
     */
    private function seedExtras(array $dishIds, $now): void
    {
        // Tonkotsu Ramen — single-required extra group (spice level)
        $spiceGroupId = DB::table('dish_extra_groups')->insertGetId(
            $this->groupRow($dishIds['Tonkotsu Ramen'], 'Nivel de picor', true, DishExtraGroup::SELECTION_SINGLE, $now),
        );

        DB::table('dish_extra_options')->insert([
            $this->optionRow($spiceGroupId, 'Suave', 0, 0, $now),
            $this->optionRow($spiceGroupId, 'Medio', 0, 1, $now),
            $this->optionRow($spiceGroupId, 'Picante', 0, 2, $now),
        ]);

        // Spicy Tuna Roll — multiple-optional extra group (extra sauce)
        $sauceGroupId = DB::table('dish_extra_groups')->insertGetId(
            $this->groupRow($dishIds['Spicy Tuna Roll'], 'Salsa extra', false, DishExtraGroup::SELECTION_MULTIPLE, $now),
        );

        DB::table('dish_extra_options')->insert([
            $this->optionRow($sauceGroupId, 'Salsa de anguila', 15.00, 0, $now),
            $this->optionRow($sauceGroupId, 'Sriracha mayo', 10.00, 1, $now),
        ]);

        // California Roll intentionally has no extra groups — covers the "no extras" shape.
    }

    private function categoryRow(string $name, int $position, $now): array
    {
        return [
            'public_id' => (string) Str::ulid(),
            'name' => $name,
            'position' => $position,
            'is_active' => true,
            'created_at' => $now,
            'updated_at' => $now,
        ];
    }

    private function dishRow(int $categoryId, string $name, string $description, float $basePrice, int $position, $now): array
    {
        return [
            'public_id' => (string) Str::ulid(),
            'dish_category_id' => $categoryId,
            'name' => $name,
            'description' => $description,
            'base_price' => $basePrice,
            'is_active' => true,
            'position' => $position,
            'created_at' => $now,
            'updated_at' => $now,
        ];
    }

    private function groupRow(int $dishId, string $name, bool $isRequired, string $selectionType, $now): array
    {
        return [
            'public_id' => (string) Str::ulid(),
            'dish_id' => $dishId,
            'name' => $name,
            'is_required' => $isRequired,
            'selection_type' => $selectionType,
            'created_at' => $now,
            'updated_at' => $now,
        ];
    }

    private function optionRow(int $groupId, string $name, float $priceDelta, int $position, $now): array
    {
        return [
            'public_id' => (string) Str::ulid(),
            'dish_extra_group_id' => $groupId,
            'name' => $name,
            'price_delta' => $priceDelta,
            'is_active' => true,
            'position' => $position,
            'created_at' => $now,
            'updated_at' => $now,
        ];
    }
}
