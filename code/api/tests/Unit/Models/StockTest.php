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

    private function makeStock(float $onHand, float $reserved): Stock
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
            'uom_id' => $uom->id, 'min_stock' => 0, 'max_stock' => 1000,
            'avg_unit_cost' => 0, 'last_unit_cost' => 0, 'is_active' => true,
        ]);

        return Stock::create([
            'inventory_location_id' => $location->id,
            'item_variant_id' => $variant->id,
            'on_hand' => $onHand,
            'reserved' => $reserved,
        ]);
    }

    #[Test]
    public function it_increases_on_hand(): void
    {
        $stock = $this->makeStock(10, 0);

        $stock->increaseOnHand(5);

        $this->assertEquals(15, (float) $stock->fresh()->on_hand);
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
}
