<?php

namespace Tests\Feature\Inventory;

use App\Models\InventoryLocation;
use App\Models\Stock;
use App\Services\Inventory\LegacyThresholdMigrator;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Schema;
use PHPUnit\Framework\Attributes\Test;

/**
 * The #439 data migration drops item_variants.min_stock/max_stock, so by the
 * time RefreshDatabase finishes there is nothing left to migrate. Each test
 * here re-creates the pre-migration shape (columns + legacy values) and drives
 * LegacyThresholdMigrator directly.
 */
class LegacyThresholdMigrationTest extends InventoryTestCase
{
    private InventoryLocation $bar;

    protected function setUp(): void
    {
        parent::setUp();

        $this->bar = InventoryLocation::create([
            'operating_unit_id' => $this->operatingUnit->id,
            'name' => 'Bar', 'type' => InventoryLocation::TYPE_BAR, 'priority' => 40, 'is_active' => true,
        ]);

        Schema::table('item_variants', function (Blueprint $table) {
            $table->decimal('min_stock', 15, 4)->default(0);
            $table->decimal('max_stock', 15, 4)->default(0);
        });
    }

    private function legacyVariant(float $min, float $max): int
    {
        $variant = $this->createItemVariant($this->createItem());
        DB::table('item_variants')->where('id', $variant->id)->update(['min_stock' => $min, 'max_stock' => $max]);

        return $variant->id;
    }

    private function stockAt(int $locationId, int $variantId): void
    {
        Stock::create(['inventory_location_id' => $locationId, 'item_variant_id' => $variantId, 'on_hand' => 1, 'reserved' => 0, 'weighted_avg_cost' => 1]);
    }

    #[Test]
    public function it_migrates_a_pair_with_stock_at_exactly_one_location(): void
    {
        $variantId = $this->legacyVariant(10, 100);
        $this->stockAt($this->location->id, $variantId);

        $result = (new LegacyThresholdMigrator)->migrate();

        $this->assertCount(1, $result['migrated']);
        $this->assertCount(0, $result['unresolved']);
        $this->assertDatabaseHas('variant_location_replenishment_policies', [
            'inventory_location_id' => $this->location->id,
            'item_variant_id' => $variantId,
            'min_stock' => 10,
            'max_stock' => 100,
        ]);
        $this->assertFalse($result['migrated'][0]['max_stock_clamped']);
    }

    #[Test]
    public function it_clamps_the_ceiling_up_to_the_reorder_point_when_the_legacy_max_is_lower(): void
    {
        // Legacy schema had no max >= min guard, so a reorder point with the
        // ceiling left at its 0 default is possible — the new check constraint
        // would otherwise abort the whole migration.
        $variantId = $this->legacyVariant(15, 0);
        $this->stockAt($this->location->id, $variantId);

        $result = (new LegacyThresholdMigrator)->migrate();

        $this->assertCount(1, $result['migrated']);
        $this->assertCount(0, $result['unresolved']);
        $this->assertTrue($result['migrated'][0]['max_stock_clamped']);
        $this->assertEquals(15.0, $result['migrated'][0]['effective_max_stock']);
        $this->assertDatabaseHas('variant_location_replenishment_policies', [
            'inventory_location_id' => $this->location->id,
            'item_variant_id' => $variantId,
            'min_stock' => 15,
            'max_stock' => 15,
        ]);
    }

    #[Test]
    public function it_leaves_a_pair_with_no_stock_unmigrated_and_reports_it(): void
    {
        $variantId = $this->legacyVariant(5, 20);

        $result = (new LegacyThresholdMigrator)->migrate();

        $this->assertCount(0, $result['migrated']);
        $this->assertSame(LegacyThresholdMigrator::REASON_NO_STOCK_LOCATION, $result['unresolved'][0]['reason']);
        $this->assertSame($variantId, $result['unresolved'][0]['item_variant_id']);
        $this->assertDatabaseCount('variant_location_replenishment_policies', 0);
    }

    #[Test]
    public function it_leaves_a_pair_with_multiple_stock_locations_unmigrated_and_reports_it(): void
    {
        $variantId = $this->legacyVariant(7, 30);
        $this->stockAt($this->location->id, $variantId);
        $this->stockAt($this->bar->id, $variantId);

        $result = (new LegacyThresholdMigrator)->migrate();

        $this->assertCount(0, $result['migrated']);
        $this->assertSame(LegacyThresholdMigrator::REASON_MULTIPLE_STOCK_LOCATIONS, $result['unresolved'][0]['reason']);
        $this->assertSame(2, $result['unresolved'][0]['location_count']);
        $this->assertDatabaseCount('variant_location_replenishment_policies', 0);
    }

    #[Test]
    public function it_ignores_variants_whose_thresholds_are_both_zero(): void
    {
        $variantId = $this->legacyVariant(0, 0);
        $this->stockAt($this->location->id, $variantId);

        $result = (new LegacyThresholdMigrator)->migrate();

        $this->assertCount(0, $result['migrated']);
        $this->assertCount(0, $result['unresolved']);
    }

    #[Test]
    public function it_is_idempotent_and_reports_an_already_migrated_pair(): void
    {
        $variantId = $this->legacyVariant(9, 40);
        $this->stockAt($this->location->id, $variantId);

        (new LegacyThresholdMigrator)->migrate();
        $result = (new LegacyThresholdMigrator)->migrate();

        $this->assertDatabaseCount('variant_location_replenishment_policies', 1);
        $this->assertCount(0, $result['migrated']);
        $this->assertSame(LegacyThresholdMigrator::REASON_ALREADY_MIGRATED, $result['unresolved'][0]['reason']);
    }

    #[Test]
    public function it_logs_a_summary_and_a_warning_per_unresolved_pair(): void
    {
        Log::spy();
        $this->legacyVariant(5, 20); // no stock → unresolved

        (new LegacyThresholdMigrator)->migrate();

        Log::shouldHaveReceived('warning')
            ->withArgs(fn ($message) => str_contains((string) $message, 'left unmigrated'))
            ->once();
        Log::shouldHaveReceived('info')
            ->withArgs(fn ($message) => str_contains((string) $message, 'replenishment migration summary'))
            ->once();
    }
}
