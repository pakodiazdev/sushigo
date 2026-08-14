<?php

namespace Tests\Feature\Inventory;

use App\Exceptions\InvalidStockBalanceException;
use App\Models\Stock;
use App\Models\StockMovement;
use App\Models\StockMovementLine;
use App\Services\Inventory\StockMutationService;
use Illuminate\Support\Facades\DB;
use PHPUnit\Framework\Attributes\Test;

/**
 * Tests for the reusable, atomic Stock mutation service that stock-out,
 * opening balance, and every future receiving/reservation/transfer flow
 * share for locked reads and guarded on_hand/reserved mutations.
 */
class StockMutationServiceTest extends InventoryTestCase
{
    protected StockMutationService $service;

    protected function setUp(): void
    {
        parent::setUp();
        $this->service = app(StockMutationService::class);
    }

    #[Test]
    public function it_locks_the_stock_row_for_update_when_reading(): void
    {
        $item = $this->createItem();
        $variant = $this->createItemVariant($item);
        Stock::create([
            'inventory_location_id' => $this->location->id,
            'item_variant_id' => $variant->id,
            'on_hand' => 10,
            'reserved' => 0,
        ]);

        $queries = [];
        DB::listen(function ($query) use (&$queries) {
            $queries[] = $query->sql;
        });

        DB::transaction(function () use ($variant) {
            $this->service->lockAndGet($this->location->id, $variant->id);
        });

        $lockedQueries = array_filter($queries, fn ($sql) => str_contains(strtolower($sql), 'for update'));

        $this->assertNotEmpty($lockedQueries, 'Expected lockAndGet() to issue a SELECT ... FOR UPDATE query');
    }

    #[Test]
    public function it_returns_null_when_locking_a_stock_row_that_does_not_exist(): void
    {
        $item = $this->createItem();
        $variant = $this->createItemVariant($item);

        $stock = DB::transaction(fn () => $this->service->lockAndGet($this->location->id, $variant->id));

        $this->assertNull($stock);
    }

    #[Test]
    public function it_creates_a_new_stock_row_on_first_receipt(): void
    {
        $item = $this->createItem();
        $variant = $this->createItemVariant($item);

        $stock = DB::transaction(fn () => $this->service->receiveInto($this->location->id, $variant->id, 25));

        $this->assertDatabaseHas('stock', [
            'inventory_location_id' => $this->location->id,
            'item_variant_id' => $variant->id,
            'on_hand' => 25,
            'reserved' => 0,
        ]);
        $this->assertEquals(25, (float) $stock->on_hand);
    }

    #[Test]
    public function it_rejects_a_non_positive_quantity_on_first_receipt(): void
    {
        $item = $this->createItem();
        $variant = $this->createItemVariant($item);

        $this->expectException(InvalidStockBalanceException::class);

        DB::transaction(fn () => $this->service->receiveInto($this->location->id, $variant->id, 0));
    }

    #[Test]
    public function it_rejects_a_non_positive_quantity_on_repeat_receipt(): void
    {
        $item = $this->createItem();
        $variant = $this->createItemVariant($item);
        Stock::create([
            'inventory_location_id' => $this->location->id,
            'item_variant_id' => $variant->id,
            'on_hand' => 10,
            'reserved' => 0,
        ]);

        $this->expectException(InvalidStockBalanceException::class);

        DB::transaction(fn () => $this->service->receiveInto($this->location->id, $variant->id, -5));
    }

    #[Test]
    public function it_takes_the_fast_path_without_attempting_an_insert_when_a_row_already_exists(): void
    {
        $item = $this->createItem();
        $variant = $this->createItemVariant($item);
        Stock::create([
            'inventory_location_id' => $this->location->id,
            'item_variant_id' => $variant->id,
            'on_hand' => 10,
            'reserved' => 0,
        ]);

        $queries = [];
        DB::listen(function ($query) use (&$queries) {
            $queries[] = $query->sql;
        });

        $stock = DB::transaction(fn () => $this->service->receiveInto($this->location->id, $variant->id, 5));

        $insertQueries = array_filter($queries, fn ($sql) => str_starts_with(strtolower($sql), 'insert into "stock"'));

        $this->assertEmpty($insertQueries, 'receiveInto() should not attempt an INSERT when lockAndGet() already found the row');
        $this->assertEquals(1, Stock::where('inventory_location_id', $this->location->id)
            ->where('item_variant_id', $variant->id)
            ->count());
        $this->assertEquals(15, (float) $stock->on_hand);
    }

    #[Test]
    public function it_recovers_from_a_unique_constraint_violation_when_a_row_already_exists(): void
    {
        $item = $this->createItem();
        $variant = $this->createItemVariant($item);

        // Simulates the exact race window insertOrRecoverFromRace() exists
        // for: receiveInto()'s own lockAndGet() found nothing a moment ago,
        // but by the time the INSERT below actually runs, a concurrent
        // caller has already committed the first row — the INSERT genuinely
        // hits the unique constraint here and must fall back to a locked
        // increment instead of crashing.
        Stock::create([
            'inventory_location_id' => $this->location->id,
            'item_variant_id' => $variant->id,
            'on_hand' => 10,
            'reserved' => 0,
        ]);

        $stock = DB::transaction(fn () => $this->service->insertOrRecoverFromRace($this->location->id, $variant->id, 5));

        $this->assertEquals(1, Stock::where('inventory_location_id', $this->location->id)
            ->where('item_variant_id', $variant->id)
            ->count());
        $this->assertEquals(15, (float) $stock->on_hand);
    }

    #[Test]
    public function it_increases_on_hand_for_a_locked_row(): void
    {
        $item = $this->createItem();
        $variant = $this->createItemVariant($item);
        $stock = Stock::create([
            'inventory_location_id' => $this->location->id,
            'item_variant_id' => $variant->id,
            'on_hand' => 10,
            'reserved' => 0,
        ]);

        $result = DB::transaction(fn () => $this->service->increaseOnHand($stock, 5));

        $this->assertEquals(15, (float) $result->on_hand);
    }

    #[Test]
    public function it_decreases_on_hand_for_a_locked_row(): void
    {
        $item = $this->createItem();
        $variant = $this->createItemVariant($item);
        $stock = Stock::create([
            'inventory_location_id' => $this->location->id,
            'item_variant_id' => $variant->id,
            'on_hand' => 10,
            'reserved' => 0,
        ]);

        $result = DB::transaction(fn () => $this->service->decreaseOnHand($stock, 4));

        $this->assertEquals(6, (float) $result->on_hand);
    }

    #[Test]
    public function it_rejects_decreasing_on_hand_below_zero(): void
    {
        $item = $this->createItem();
        $variant = $this->createItemVariant($item);
        $stock = Stock::create([
            'inventory_location_id' => $this->location->id,
            'item_variant_id' => $variant->id,
            'on_hand' => 3,
            'reserved' => 0,
        ]);

        $this->expectException(InvalidStockBalanceException::class);

        DB::transaction(fn () => $this->service->decreaseOnHand($stock, 4));
    }

    #[Test]
    public function it_rolls_back_the_movement_and_line_when_the_guarded_mutation_is_rejected(): void
    {
        $item = $this->createItem();
        $variant = $this->createItemVariant($item);
        $stock = Stock::create([
            'inventory_location_id' => $this->location->id,
            'item_variant_id' => $variant->id,
            'on_hand' => 3,
            'reserved' => 0,
        ]);

        try {
            DB::transaction(function () use ($variant, $stock) {
                $movement = StockMovement::create([
                    'from_location_id' => $this->location->id,
                    'to_location_id' => null,
                    'item_variant_id' => $variant->id,
                    'qty' => 4,
                    'reason' => StockMovement::REASON_CONSUMPTION,
                    'status' => StockMovement::STATUS_POSTED,
                    'meta' => [],
                    'posted_at' => now(),
                ]);

                StockMovementLine::create([
                    'stock_movement_id' => $movement->id,
                    'item_variant_id' => $variant->id,
                    'uom_id' => $this->uomKg->id,
                    'qty' => 4,
                    'base_qty' => 4,
                    'conversion_factor' => 1,
                    'unit_cost' => 0,
                    'line_total' => 0,
                    'meta' => [],
                ]);

                // Requests more than on_hand (3) — the guard must reject this
                // and roll back the movement + line created moments earlier
                // in the same transaction.
                $this->service->decreaseOnHand($stock, 4);
            });
        } catch (InvalidStockBalanceException) {
            // expected — assertions below verify the rollback
        }

        $this->assertDatabaseCount('stock_movements', 0);
        $this->assertDatabaseCount('stock_movement_lines', 0);
        $this->assertEquals(3, (float) $stock->fresh()->on_hand);
    }
}
