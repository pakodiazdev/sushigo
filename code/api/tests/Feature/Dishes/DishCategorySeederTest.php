<?php

namespace Tests\Feature\Dishes;

use App\Models\DishCategory;
use Database\Seeders\Development\DishCategorySeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class DishCategorySeederTest extends TestCase
{
    use RefreshDatabase;

    private const EXPECTED_CATEGORIES = [
        'Rollos',
        'Onigiris',
        'Yakionigiris',
        'Sushiball',
        'Ramen',
        'Alitas',
        'Boneless',
        'Dumplings',
        'Paquetes',
    ];

    #[Test]
    public function seeds_every_live_menu_category(): void
    {
        $this->seed(DishCategorySeeder::class);

        foreach (self::EXPECTED_CATEGORIES as $name) {
            $this->assertDatabaseHas('dish_categories', ['name' => $name, 'is_active' => true]);
        }

        $this->assertSame(count(self::EXPECTED_CATEGORIES), DB::table('dish_categories')->count());
    }

    #[Test]
    public function categories_have_a_stable_display_order(): void
    {
        $this->seed(DishCategorySeeder::class);

        $positions = DB::table('dish_categories')->orderBy('position')->pluck('name')->toArray();

        $this->assertSame(self::EXPECTED_CATEGORIES, $positions);
    }

    #[Test]
    public function is_idempotent_when_run_more_than_once(): void
    {
        $this->seed(DishCategorySeeder::class);
        $this->seed(DishCategorySeeder::class);

        $this->assertSame(count(self::EXPECTED_CATEGORIES), DB::table('dish_categories')->count());
    }

    #[Test]
    public function does_not_create_a_duplicate_when_a_category_was_soft_deleted(): void
    {
        $this->seed(DishCategorySeeder::class);

        DishCategory::where('name', 'Rollos')->first()->delete();

        $this->seed(DishCategorySeeder::class);

        $this->assertSame(
            count(self::EXPECTED_CATEGORIES),
            DishCategory::withTrashed()->count(),
            'Re-seeding after a soft delete must update the trashed row, not insert a duplicate',
        );
    }

    #[Test]
    public function restores_a_soft_deleted_category_on_re_seed(): void
    {
        $this->seed(DishCategorySeeder::class);

        DishCategory::where('name', 'Rollos')->first()->delete();
        $this->assertSoftDeleted('dish_categories', ['name' => 'Rollos']);

        $this->seed(DishCategorySeeder::class);

        $this->assertDatabaseHas('dish_categories', [
            'name' => 'Rollos',
            'is_active' => true,
            'deleted_at' => null,
        ]);
    }
}
