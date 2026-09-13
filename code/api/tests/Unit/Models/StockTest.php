<?php

namespace Tests\Unit\Models;

use App\Exceptions\InvalidStockBalanceException;
use App\Models\Branch;
use App\Models\InventoryLocation;
use App\Models\Item;
use App\Models\ItemVariant;
use App\Models\OperatingUnit;
use App\Models\Stock;
use App\Models\UnitOfMeasure;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

/**
 * Unit tests for the nonnegative on_hand/reserved invariant guards on the
 * Stock model itself — the application-layer backstop that protects any
 * future reservation/transfer flow calling these methods directly, not just
 * the services that go through StockMutationService.
 */
class StockTest extends TestCase
{
    use RefreshDatabase;

    private function makeStock(float|string $onHand, float|string $reserved, float|string|null $weightedAvgCost = null): Stock
    {
        $branch = Branch::create([
            'code' => 'TEST', 'name' => 'Test Branch', 'address' => '123 Test St',
            'city' => 'Test City', 'state' => 'TS', 'country' => 'MX',
            'postal_code' => '12345', 'is_active' => true,
        ]);

        $operatingUnit = OperatingUnit::create([
            'branch_id' => $branch->id, 'type' => 'BRANCH_MAIN',
            'name' => 'Test Main Inventory', 'is_active' => true,
        ]);

        $location = InventoryLocation::create([
            'operating_unit_id' => $operatingUnit->id, 'name' => 'Test Warehouse',
            'type' => 'MAIN', 'priority' => 100, 'is_active' => true,
        ]);

        $uom = UnitOfMeasure::create([
            'code' => 'KG', 'name' => 'Kilogram', 'symbol' => 'kg',
            'type' => 'WEIGHT', 'precision' => 3, 'is_base' => true, 'is_active' => true,
        ]);

        $item = Item::create([
            'sku' => 'TEST-'.uniqid(), 'name' => 'Test Item', 'type' => 'INSUMO',
            'is_stocked' => true, 'is_perishable' => false, 'is_active' => true,
        ]);

        $variant = ItemVariant::create([
            'item_id' => $item->id, 'code' => 'VAR-'.uniqid(), 'name' => 'Test Variant',
            'uom_id' => $uom->id, 'is_active' => true,
        ]);

        return Stock::create(array_filter([
            'inventory_location_id' => $location->id,
            'item_variant_id' => $variant->id,
            'on_hand' => $onHand,
            'reserved' => $reserved,
            'weighted_avg_cost' => $weightedAvgCost,
        ], fn ($value) => $value !== null));
    }

    #[Test]
    public function it_increases_on_hand(): void
    {
        $stock = $this->makeStock(10, 0);

        $stock->increaseOnHand(5);

        $this->assertEquals(15, (float) $stock->fresh()->on_hand);
    }

    #[Test]
    public function it_accepts_an_increment_that_lands_exactly_on_the_decimal_ceiling(): void
    {
        // 99999999999.9998 + 0.0001 is exactly MAX_STORED_QUANTITY, but the raw
        // binary-float sum sits a fraction of a ULP above it — the guard must
        // compare at the column's decimal(15,4) scale, not on the raw float.
        // Seed the boundary values as strings so the ceiling is stored exactly.
        $stock = $this->makeStock('99999999999.9998', '0');

        $stock->increaseOnHand(0.0001);

        $this->assertSame('99999999999.9999', $stock->fresh()->on_hand);
    }

    #[Test]
    public function it_rejects_an_increment_that_would_cross_the_decimal_ceiling(): void
    {
        $stock = $this->makeStock('99999999999.9999', '0');

        $this->expectException(InvalidStockBalanceException::class);

        $stock->increaseOnHand(0.0001);
    }

    #[Test]
    public function it_decreases_on_hand(): void
    {
        $stock = $this->makeStock(10, 0);

        $stock->decreaseOnHand(4);

        $this->assertEquals(6, (float) $stock->fresh()->on_hand);
    }

    #[Test]
    public function it_rejects_decreasing_on_hand_below_zero(): void
    {
        $stock = $this->makeStock(3, 0);

        $this->expectException(InvalidStockBalanceException::class);

        $stock->decreaseOnHand(4);
    }

    #[Test]
    public function it_rejects_decreasing_on_hand_below_reserved(): void
    {
        $stock = $this->makeStock(10, 8);

        $this->expectException(InvalidStockBalanceException::class);

        // Resulting on_hand (5) would stay >= 0 but drop below reserved (8),
        // violating the reserved <= on_hand invariant.
        $stock->decreaseOnHand(5);
    }

    #[Test]
    public function it_reserves_available_quantity(): void
    {
        $stock = $this->makeStock(10, 2);

        $stock->reserve(5);

        $this->assertEquals(7, (float) $stock->fresh()->reserved);
    }

    #[Test]
    public function it_rejects_reserving_more_than_available(): void
    {
        $stock = $this->makeStock(10, 8);

        $this->expectException(InvalidStockBalanceException::class);

        // Only 2 available (10 - 8) — requesting 3 must be rejected.
        $stock->reserve(3);
    }

    #[Test]
    public function it_releases_reserved_quantity(): void
    {
        $stock = $this->makeStock(10, 5);

        $stock->release(2);

        $this->assertEquals(3, (float) $stock->fresh()->reserved);
    }

    #[Test]
    public function it_rejects_releasing_more_than_reserved(): void
    {
        $stock = $this->makeStock(10, 2);

        $this->expectException(InvalidStockBalanceException::class);

        $stock->release(3);
    }

    #[Test]
    public function it_reports_available_as_on_hand_minus_reserved(): void
    {
        $stock = $this->makeStock(10, 4)->fresh();

        $this->assertTrue($stock->hasAvailable(6));
        $this->assertFalse($stock->hasAvailable(7));
    }

    #[Test]
    public function total_value_column_holds_the_full_on_hand_times_cost_product_at_the_decimal_15_4_ceiling(): void
    {
        // Code review finding (#579 PR #626): on_hand and weighted_avg_cost are
        // each decimal(15,4) (11 integer digits), so their product can need up
        // to 22 integer digits even when each factor individually fits its own
        // column — total_value (decimal(26,4)) must hold that product exactly.
        // Written via a raw DB update (not Eloquent/PHP float arithmetic,
        // which cannot represent a 22-digit integer exactly regardless of
        // column width — a separate, pre-existing float-precision limitation
        // this Issue does not extend to) to isolate exactly what the Postgres
        // column itself can and cannot store.
        $stock = $this->makeStock(0, 0);

        $exactProduct = bcmul('99999999999.9999', '99999999999.9999', 4);

        DB::table('stock')->where('id', $stock->id)->update([
            'total_value' => $exactProduct,
        ]);

        $this->assertSame($exactProduct, $stock->fresh()->total_value);
    }

    #[Test]
    public function it_fully_depletes_on_hand_without_driving_total_value_negative_despite_rounding(): void
    {
        // Code review finding (#579 PR #626): weighted_avg_cost is a *rounded*
        // scale-4 rate while total_value is exact, so qty * weighted_avg_cost
        // can exceed what is actually left on a full depletion. Blending
        // 1 unit @ 0.1 with 2 units @ 0.2 stores a rounded average of 0.1667
        // (true value/qty ratio is 0.5/3 = 0.16666...), so depleting all 3
        // units at that rounded rate computes 3 * 0.1667 = 0.5001 — 0.0001
        // more than the exact total_value of 0.5000.
        $stock = $this->makeStock(0, 0);
        $stock->increaseOnHand(1);
        $stock->applyWeightedAverageCost(1, 0.1);
        $stock->increaseOnHand(2);
        $stock->applyWeightedAverageCost(2, 0.2);
        $stock->refresh();

        $this->assertEquals(0.5, (float) $stock->total_value);
        $this->assertEquals(0.1667, (float) $stock->weighted_avg_cost);

        $stock->decreaseOnHand(3);

        $stock->refresh();
        $this->assertEquals(0.0, (float) $stock->on_hand);
        $this->assertEquals(0.0, (float) $stock->total_value);
    }

    #[Test]
    public function a_third_blend_reconciles_from_the_exact_accumulator_not_a_rounded_prior_average(): void
    {
        // Code review finding (#579 PR #626): 10,000 units @ 0.0001 then
        // 10,000 @ 0.0002 accumulate an exact value/qty ratio of 0.00015,
        // which itself rounds to a stored average of 0.0002 (no drift yet).
        // A third batch of 10,000 @ 0.0001 blended from that *rounded* 0.0002
        // (instead of the exact accumulator) would land on 0.0002 again,
        // while the true ratio (4.0000 / 30,000) rounds to 0.0001.
        $stock = $this->makeStock(0, 0);

        $stock->increaseOnHand(10000);
        $stock->applyWeightedAverageCost(10000, 0.0001);
        $stock->increaseOnHand(10000);
        $stock->applyWeightedAverageCost(10000, 0.0002);
        $stock->refresh();

        $this->assertEquals(3.0, (float) $stock->total_value);
        $this->assertEquals(0.0002, (float) $stock->weighted_avg_cost);

        $stock->increaseOnHand(10000);
        $stock->applyWeightedAverageCost(10000, 0.0001);
        $stock->refresh();

        $this->assertEquals(4.0, (float) $stock->total_value);
        $this->assertEquals(0.0001, (float) $stock->weighted_avg_cost);
    }
}
