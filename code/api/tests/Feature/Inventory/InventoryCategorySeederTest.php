<?php

namespace Tests\Feature\Inventory;

use App\Models\InventoryCategory;
use Database\Seeders\Development\InventoryCategorySeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class InventoryCategorySeederTest extends TestCase
{
    use RefreshDatabase;

    private const EXPECTED_CATEGORIES = [
        'Bebidas',
        'Ramen Instantáneo',
        'Dulces y Botanas',
        'Postres Congelados',
    ];

    #[Test]
    public function seeds_every_expected_category(): void
    {
        $this->seed(InventoryCategorySeeder::class);

        foreach (self::EXPECTED_CATEGORIES as $name) {
            $this->assertDatabaseHas('inventory_categories', ['name' => $name, 'is_active' => true]);
        }

        $this->assertSame(count(self::EXPECTED_CATEGORIES), DB::table('inventory_categories')->count());
    }

    #[Test]
    public function categories_have_a_stable_display_order(): void
    {
        $this->seed(InventoryCategorySeeder::class);

        $positions = DB::table('inventory_categories')->orderBy('position')->pluck('name')->toArray();

        $this->assertSame(self::EXPECTED_CATEGORIES, $positions);
    }

    #[Test]
    public function is_idempotent_when_run_more_than_once(): void
    {
        $this->seed(InventoryCategorySeeder::class);
        $this->seed(InventoryCategorySeeder::class);

        $this->assertSame(count(self::EXPECTED_CATEGORIES), DB::table('inventory_categories')->count());
    }

    #[Test]
    public function does_not_create_a_duplicate_when_a_category_was_soft_deleted(): void
    {
        $this->seed(InventoryCategorySeeder::class);

        InventoryCategory::where('name', 'Bebidas')->first()->delete();

        $this->seed(InventoryCategorySeeder::class);

        $this->assertSame(
            count(self::EXPECTED_CATEGORIES),
            InventoryCategory::withTrashed()->count(),
            'Re-seeding after a soft delete must update the trashed row, not insert a duplicate',
        );
    }

    #[Test]
    public function restores_a_soft_deleted_category_on_re_seed(): void
    {
        $this->seed(InventoryCategorySeeder::class);

        InventoryCategory::where('name', 'Bebidas')->first()->delete();
        $this->assertSoftDeleted('inventory_categories', ['name' => 'Bebidas']);

        $this->seed(InventoryCategorySeeder::class);

        $this->assertDatabaseHas('inventory_categories', [
            'name' => 'Bebidas',
            'is_active' => true,
            'deleted_at' => null,
        ]);
    }
}
