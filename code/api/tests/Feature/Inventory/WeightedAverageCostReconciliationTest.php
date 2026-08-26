<?php

namespace Tests\Feature\Inventory;

use App\Models\InventoryLocation;
use App\Models\Stock;
use Illuminate\Support\Facades\Log;
use PHPUnit\Framework\Attributes\Test;

/**
 * Regression coverage for the #434 reconciliation migration
 * (2026_08_25_030000_reconcile_item_variant_weighted_average_cost.php) —
 * exercised directly (not via a full `migrate`, since the schema is already
 * current after RefreshDatabase) so the backfill logic itself is verified
 * in isolation.
 */
class WeightedAverageCostReconciliationTest extends InventoryTestCase
{
    #[Test]
    public function it_backfills_stale_avg_unit_cost_from_the_stock_rollup()
    {
        $item = $this->createItem(['name' => 'Reconciliation Item']);
        $variant = $this->createItemVariant($item, [
            'name' => 'Stale Variant',
            'uom_id' => $this->uomKg->id,
            'avg_unit_cost' => 999.9999, // stale value from before #434
        ]);

        // 10 units @ 100 + 20 units @ 150 = (10*100 + 20*150) / 30 = 133.3333
        Stock::create([
            'inventory_location_id' => $this->location->id,
            'item_variant_id' => $variant->id,
            'on_hand' => 10,
            'reserved' => 0,
            'weighted_avg_cost' => 100,
        ]);

        $secondLocation = InventoryLocation::create([
            'operating_unit_id' => $this->operatingUnit->id,
            'name' => 'Reconciliation Second Warehouse',
            'type' => 'MAIN',
            'priority' => 90,
            'is_active' => true,
        ]);

        Stock::create([
            'inventory_location_id' => $secondLocation->id,
            'item_variant_id' => $variant->id,
            'on_hand' => 20,
            'reserved' => 0,
            'weighted_avg_cost' => 150,
        ]);

        Log::spy();

        $this->runReconciliationMigration();

        $variant->refresh();
        $this->assertEquals(133.3333, (float) $variant->avg_unit_cost);

        Log::shouldHaveReceived('info')
            ->once()
            ->withArgs(function (string $message, array $context) use ($variant) {
                return str_contains($message, 'reconciliation')
                    && $context['item_variant_id'] === $variant->id
                    && abs($context['before'] - 999.9999) < 0.00005
                    && abs($context['after'] - 133.3333) < 0.00005;
            });
    }

    #[Test]
    public function it_leaves_variants_with_no_on_hand_stock_untouched()
    {
        $item = $this->createItem(['name' => 'Zero Stock Item']);
        $variant = $this->createItemVariant($item, [
            'name' => 'Zero Stock Variant',
            'uom_id' => $this->uomKg->id,
            'avg_unit_cost' => 42.0000,
        ]);

        Stock::create([
            'inventory_location_id' => $this->location->id,
            'item_variant_id' => $variant->id,
            'on_hand' => 0,
            'reserved' => 0,
            'weighted_avg_cost' => 0,
        ]);

        $this->runReconciliationMigration();

        $variant->refresh();
        $this->assertEquals(42.0000, (float) $variant->avg_unit_cost);
    }

    #[Test]
    public function it_seeds_zero_cost_stock_from_the_legacy_variant_cost_before_rolling_up()
    {
        $item = $this->createItem(['name' => 'Pre-Existing Opening Balance Item']);
        $variant = $this->createItemVariant($item, [
            'name' => 'Pre-Existing Opening Balance Variant',
            'uom_id' => $this->uomKg->id,
            'avg_unit_cost' => 80.0000, // legacy value written by pre-#434 OpeningBalanceService
        ]);

        // Simulates a Stock row created by the pre-#434 OpeningBalanceService,
        // which never wrote Stock.weighted_avg_cost — it stayed at the column
        // default (0) even though on_hand is positive.
        $stock = Stock::create([
            'inventory_location_id' => $this->location->id,
            'item_variant_id' => $variant->id,
            'on_hand' => 10,
            'reserved' => 0,
            'weighted_avg_cost' => 0,
        ]);

        Log::spy();

        $this->runReconciliationMigration();

        $stock->refresh();
        $this->assertEquals(80.0000, (float) $stock->weighted_avg_cost);

        Log::shouldHaveReceived('info')
            ->once()
            ->withArgs(function (string $message, array $context) use ($stock, $variant) {
                return str_contains($message, 'seeded')
                    && $context['stock_id'] === $stock->id
                    && $context['item_variant_id'] === $variant->id
                    && abs($context['seeded_cost'] - 80.0000) < 0.00005;
            });

        // With only one location and it now seeded at the same value, the
        // rollup pass has nothing to change.
        $variant->refresh();
        $this->assertEquals(80.0000, (float) $variant->avg_unit_cost);
    }

    #[Test]
    public function it_does_not_seed_a_zero_cost_stock_row_when_the_legacy_variant_cost_is_also_zero()
    {
        $item = $this->createItem(['name' => 'Never Costed Item']);
        $variant = $this->createItemVariant($item, [
            'name' => 'Never Costed Variant',
            'uom_id' => $this->uomKg->id,
            'avg_unit_cost' => 0,
        ]);

        $stock = Stock::create([
            'inventory_location_id' => $this->location->id,
            'item_variant_id' => $variant->id,
            'on_hand' => 5,
            'reserved' => 0,
            'weighted_avg_cost' => 0,
        ]);

        $this->runReconciliationMigration();

        $stock->refresh();
        $this->assertEquals(0, (float) $stock->weighted_avg_cost);
    }

    #[Test]
    public function it_leaves_variants_already_reconciled_untouched()
    {
        $item = $this->createItem(['name' => 'Already Reconciled Item']);
        $variant = $this->createItemVariant($item, [
            'name' => 'Already Reconciled Variant',
            'uom_id' => $this->uomKg->id,
            'avg_unit_cost' => 100.0000,
        ]);

        Stock::create([
            'inventory_location_id' => $this->location->id,
            'item_variant_id' => $variant->id,
            'on_hand' => 5,
            'reserved' => 0,
            'weighted_avg_cost' => 100,
        ]);

        Log::spy();

        $this->runReconciliationMigration();

        Log::shouldNotHaveReceived('info');

        $variant->refresh();
        $this->assertEquals(100.0000, (float) $variant->avg_unit_cost);
    }

    private function runReconciliationMigration(): void
    {
        $migration = require database_path('migrations/2026_08_25_030000_reconcile_item_variant_weighted_average_cost.php');
        $migration->up();
    }
}
