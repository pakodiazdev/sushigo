<?php

namespace Tests\Feature\Inventory;

use App\Models\Brand;
use Database\Seeders\Development\BrandSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class BrandSeederTest extends TestCase
{
    use RefreshDatabase;

    private const EXPECTED_BRANDS = [
        'Coca-Cola',
        'Buldak',
        'Peelez',
        'Ramune',
        'Mochis',
    ];

    #[Test]
    public function seeds_every_expected_brand(): void
    {
        $this->seed(BrandSeeder::class);

        foreach (self::EXPECTED_BRANDS as $name) {
            $this->assertDatabaseHas('brands', ['name' => $name, 'is_active' => true]);
        }

        $this->assertSame(count(self::EXPECTED_BRANDS), DB::table('brands')->count());
    }

    #[Test]
    public function is_idempotent_when_run_more_than_once(): void
    {
        $this->seed(BrandSeeder::class);
        $this->seed(BrandSeeder::class);

        $this->assertSame(count(self::EXPECTED_BRANDS), DB::table('brands')->count());
    }

    #[Test]
    public function does_not_create_a_duplicate_when_a_brand_was_soft_deleted(): void
    {
        $this->seed(BrandSeeder::class);

        Brand::where('name', 'Coca-Cola')->first()->delete();

        $this->seed(BrandSeeder::class);

        $this->assertSame(
            count(self::EXPECTED_BRANDS),
            Brand::withTrashed()->count(),
            'Re-seeding after a soft delete must update the trashed row, not insert a duplicate',
        );
    }

    #[Test]
    public function restores_a_soft_deleted_brand_on_re_seed(): void
    {
        $this->seed(BrandSeeder::class);

        Brand::where('name', 'Coca-Cola')->first()->delete();
        $this->assertSoftDeleted('brands', ['name' => 'Coca-Cola']);

        $this->seed(BrandSeeder::class);

        $this->assertDatabaseHas('brands', [
            'name' => 'Coca-Cola',
            'is_active' => true,
            'deleted_at' => null,
        ]);
    }

    #[Test]
    public function re_seeding_prefers_a_live_replacement_over_restoring_an_older_trashed_duplicate(): void
    {
        // brands_name_unique is a partial index scoped to deleted_at is null, so a
        // trashed "Coca-Cola" and a live "Coca-Cola" can coexist — a developer who
        // deletes the seeded brand and creates a fresh one with the same name hits
        // this exact state. Re-seeding must update the live row, not try to restore
        // the older trashed one (which would collide with the live row on that index).
        $this->seed(BrandSeeder::class);

        $trashed = Brand::where('name', 'Coca-Cola')->first();
        $trashed->delete();
        $live = Brand::create(['name' => 'Coca-Cola', 'is_active' => false]);

        $this->seed(BrandSeeder::class);

        $this->assertDatabaseHas('brands', ['id' => $live->id, 'name' => 'Coca-Cola', 'is_active' => true, 'deleted_at' => null]);
        $this->assertSoftDeleted('brands', ['id' => $trashed->id]);
        $this->assertSame(
            count(self::EXPECTED_BRANDS) + 1,
            Brand::withTrashed()->count(),
            'The older trashed duplicate must stay trashed, not be restored alongside the live replacement',
        );
    }
}
