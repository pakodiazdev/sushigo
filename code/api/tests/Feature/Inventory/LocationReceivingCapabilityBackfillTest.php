<?php

namespace Tests\Feature\Inventory;

use App\Models\InventoryLocation;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use PHPUnit\Framework\Attributes\Test;

/**
 * By the time RefreshDatabase runs the #568 migration during setUp() the
 * inventory_locations table is empty, so its conservative backfill never has a
 * row to touch. Each test here recreates the "pre-backfill" shape (rows with
 * can_receive_purchases forced back to false) and re-runs the migration's up()
 * to actually exercise the backfill rule:
 *
 *   only  active  +  is_primary  +  type = MAIN  +  not soft-deleted  →  true
 */
class LocationReceivingCapabilityBackfillTest extends InventoryTestCase
{
    private const MIGRATION = 'migrations/2026_09_03_000000_add_can_receive_purchases_to_inventory_locations_table.php';

    private function runBackfill(): void
    {
        (require database_path(self::MIGRATION))->up();
    }

    private function makeLocation(array $attributes): InventoryLocation
    {
        $location = InventoryLocation::create(array_merge([
            'operating_unit_id' => $this->operatingUnit->id,
            'name' => 'Loc '.uniqid(),
            'type' => InventoryLocation::TYPE_MAIN,
            'priority' => 50,
            'is_active' => true,
            'is_primary' => false,
        ], $attributes));

        // Simulate the state that existed before the backfill column landed.
        DB::table('inventory_locations')
            ->where('id', $location->id)
            ->update(['can_receive_purchases' => false]);

        return $location->refresh();
    }

    #[Test]
    public function it_backfills_only_active_primary_main_locations(): void
    {
        $eligible = $this->makeLocation(['type' => 'MAIN', 'is_active' => true, 'is_primary' => true]);
        $notPrimary = $this->makeLocation(['type' => 'MAIN', 'is_active' => true, 'is_primary' => false]);
        $inactive = $this->makeLocation(['type' => 'MAIN', 'is_active' => false, 'is_primary' => true]);
        $notMain = $this->makeLocation(['type' => 'KITCHEN', 'is_active' => true, 'is_primary' => true]);

        $this->runBackfill();

        $this->assertTrue($eligible->refresh()->can_receive_purchases);
        $this->assertFalse($notPrimary->refresh()->can_receive_purchases);
        $this->assertFalse($inactive->refresh()->can_receive_purchases);
        $this->assertFalse($notMain->refresh()->can_receive_purchases);
    }

    #[Test]
    public function it_does_not_backfill_a_soft_deleted_primary_main_location(): void
    {
        $deleted = $this->makeLocation(['type' => 'MAIN', 'is_active' => true, 'is_primary' => true]);
        $deleted->delete();

        $this->runBackfill();

        $this->assertFalse((bool) DB::table('inventory_locations')->where('id', $deleted->id)->value('can_receive_purchases'));
    }

    #[Test]
    public function it_is_idempotent_when_run_twice(): void
    {
        $eligible = $this->makeLocation(['type' => 'MAIN', 'is_active' => true, 'is_primary' => true]);

        $this->runBackfill();
        $this->runBackfill();

        $this->assertTrue($eligible->refresh()->can_receive_purchases);
    }

    #[Test]
    public function it_defaults_new_columns_to_false(): void
    {
        $location = InventoryLocation::create([
            'operating_unit_id' => $this->operatingUnit->id,
            'name' => 'Fresh Location',
            'type' => InventoryLocation::TYPE_MAIN,
            'priority' => 10,
            'is_active' => true,
            'is_primary' => true,
        ]);

        // No backfill run — the column default alone must govern a brand new row.
        $this->assertFalse($location->refresh()->can_receive_purchases);
    }

    #[Test]
    public function the_migration_down_removes_the_column_and_is_reversible(): void
    {
        $this->assertTrue(Schema::hasColumn('inventory_locations', 'can_receive_purchases'));

        (require database_path(self::MIGRATION))->down();
        $this->assertFalse(Schema::hasColumn('inventory_locations', 'can_receive_purchases'));

        (require database_path(self::MIGRATION))->up();
        $this->assertTrue(Schema::hasColumn('inventory_locations', 'can_receive_purchases'));
    }
}
