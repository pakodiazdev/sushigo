<?php

namespace Tests\Feature\Dishes;

use App\Models\Dish;
use App\Models\DishCategory;
use Database\Seeders\Development\DishCategorySeeder;
use Database\Seeders\Development\DishSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class DishSeederTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(DishCategorySeeder::class);
    }

    #[Test]
    public function seeds_a_reasonable_spread_of_dishes_per_category(): void
    {
        $this->seed(DishSeeder::class);

        $categoryIds = DB::table('dish_categories')->pluck('id');

        foreach ($categoryIds as $categoryId) {
            $count = DB::table('dishes')->where('dish_category_id', $categoryId)->count();
            $this->assertGreaterThanOrEqual(3, $count, "Category id {$categoryId} has too few dishes");
        }
    }

    #[Test]
    public function every_dish_has_a_realistic_price_and_description(): void
    {
        $this->seed(DishSeeder::class);

        $dishes = DB::table('dishes')->get();

        $this->assertGreaterThan(0, $dishes->count());

        foreach ($dishes as $dish) {
            $this->assertNotEmpty($dish->description);
            $this->assertGreaterThan(0, (float) $dish->base_price);
        }
    }

    #[Test]
    public function seeds_a_ramen_with_a_spice_level_extra_group(): void
    {
        $this->seed(DishSeeder::class);

        $dishId = DB::table('dishes')->where('name', 'Tonkotsu Ramen')->value('id');
        $this->assertNotNull($dishId, 'Expected the seeded "Tonkotsu Ramen" dish to exist');

        $this->assertDatabaseHas('dish_extra_groups', [
            'dish_id' => $dishId,
            'name' => 'Nivel de picor',
            'is_required' => true,
            'selection_type' => 'SINGLE',
        ]);
    }

    #[Test]
    public function seeds_a_roll_with_a_sauce_choice_extra_group(): void
    {
        $this->seed(DishSeeder::class);

        $dishId = DB::table('dishes')->where('name', 'Spicy Tuna Roll')->value('id');
        $this->assertNotNull($dishId, 'Expected the seeded "Spicy Tuna Roll" dish to exist');

        $this->assertDatabaseHas('dish_extra_groups', [
            'dish_id' => $dishId,
            'name' => 'Salsa extra',
            'is_required' => false,
            'selection_type' => 'MULTIPLE',
        ]);
    }

    #[Test]
    public function is_idempotent_when_run_more_than_once(): void
    {
        $this->seed(DishSeeder::class);
        $countAfterFirstRun = DB::table('dishes')->count();

        $this->seed(DishSeeder::class);
        $countAfterSecondRun = DB::table('dishes')->count();

        $this->assertSame($countAfterFirstRun, $countAfterSecondRun);
    }

    #[Test]
    public function does_not_create_a_duplicate_when_a_dish_was_soft_deleted(): void
    {
        $this->seed(DishSeeder::class);
        $totalBeforeDelete = Dish::withTrashed()->count();

        Dish::where('name', 'California Roll')->first()->delete();

        $this->seed(DishSeeder::class);

        $this->assertSame(
            $totalBeforeDelete,
            Dish::withTrashed()->count(),
            'Re-seeding after a soft delete must update the trashed row, not insert a duplicate',
        );
    }

    #[Test]
    public function restores_a_soft_deleted_dish_on_re_seed(): void
    {
        $this->seed(DishSeeder::class);

        Dish::where('name', 'California Roll')->first()->delete();
        $this->assertSoftDeleted('dishes', ['name' => 'California Roll']);

        $this->seed(DishSeeder::class);

        $this->assertDatabaseHas('dishes', [
            'name' => 'California Roll',
            'is_active' => true,
            'deleted_at' => null,
        ]);
    }

    #[Test]
    public function restores_every_dish_in_a_soft_deleted_category_on_re_seed(): void
    {
        $this->seed(DishSeeder::class);
        $dishCountBefore = DB::table('dishes')->count();

        DishCategory::where('name', 'Rollos')->first()->delete();
        $this->assertSoftDeleted('dish_categories', ['name' => 'Rollos']);
        $this->assertDatabaseMissing('dishes', ['name' => 'California Roll', 'deleted_at' => null]);

        // A full development reset re-seeds the category before its dishes.
        $this->seed(DishCategorySeeder::class);
        $this->seed(DishSeeder::class);

        $this->assertDatabaseHas('dish_categories', ['name' => 'Rollos', 'deleted_at' => null]);
        $this->assertDatabaseHas('dishes', ['name' => 'California Roll', 'deleted_at' => null]);
        $this->assertSame($dishCountBefore, DB::table('dishes')->count());
    }
}
