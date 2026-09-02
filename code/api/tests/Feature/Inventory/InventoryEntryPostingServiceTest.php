<?php

namespace Tests\Feature\Inventory;

use App\DataTransferObjects\Inventory\InventoryEntryLineData;
use App\DataTransferObjects\Inventory\InventoryEntryPostingData;
use App\Models\ItemVariant;
use App\Models\Receipt;
use App\Models\Stock;
use App\Models\StockMovement;
use App\Services\Inventory\InventoryEntryPostingService;
use App\Services\Inventory\StockMutationService;
use Illuminate\Support\Facades\DB;
use Mockery;
use PHPUnit\Framework\Attributes\Test;
use RuntimeException;

/**
 * The shared inbound posting primitive (#567): normalized entry, first vs.
 * repeat entry, zero/null cost, deterministic idempotent replay, and
 * all-or-nothing rollback.
 */
class InventoryEntryPostingServiceTest extends InventoryTestCase
{
    private InventoryEntryPostingService $service;

    private ItemVariant $variant;

    protected function setUp(): void
    {
        parent::setUp();
        $this->service = app(InventoryEntryPostingService::class);
        $this->variant = $this->createItemVariant($this->createItem());
    }

    private function data(array $overrides = []): InventoryEntryPostingData
    {
        return new InventoryEntryPostingData(...array_merge([
            'inventoryLocationId' => $this->location->id,
            'itemVariantId' => $this->variant->id,
            'baseQuantity' => 10.0,
            'reason' => StockMovement::REASON_PURCHASE_RECEIPT,
            'userId' => $this->user->id,
            'unitCost' => 5.0,
            'sourceType' => Receipt::class,
            'sourceId' => 100,
            'sourceLineId' => 1,
            'line' => new InventoryEntryLineData(
                uomId: $this->uomKg->id,
                qty: 10.0,
                baseQty: 10.0,
                conversionFactor: 1.0,
                unitCost: 5.0,
                lineTotal: 50.0,
            ),
        ], $overrides));
    }

    private function postEntry(array $overrides = []): StockMovement
    {
        return DB::transaction(fn () => $this->service->post($this->data($overrides)));
    }

    #[Test]
    public function it_posts_a_first_entry_atomically_with_evidence_stock_and_cost(): void
    {
        $movement = $this->postEntry();

        $this->assertSame(StockMovement::REASON_PURCHASE_RECEIPT, $movement->reason);
        $this->assertTrue($movement->isPosted());
        $this->assertSame(1, (int) $movement->related_line_id);
        $this->assertEquals(10.0, (float) $movement->qty);
        $this->assertCount(1, $movement->lines);
        $this->assertEquals(50.0, (float) $movement->lines->first()->line_total);

        $stock = Stock::where('inventory_location_id', $this->location->id)
            ->where('item_variant_id', $this->variant->id)
            ->first();

        $this->assertEquals(10.0, (float) $stock->on_hand);
        $this->assertEquals(5.0, (float) $stock->weighted_avg_cost);
    }

    #[Test]
    public function it_increments_an_existing_stock_row_and_reblends_cost_on_a_repeat_entry(): void
    {
        Stock::create([
            'inventory_location_id' => $this->location->id,
            'item_variant_id' => $this->variant->id,
            'on_hand' => 10,
            'reserved' => 0,
            'weighted_avg_cost' => 4,
        ]);

        $this->postEntry(['unitCost' => 6.0, 'sourceLineId' => 7, 'line' => null]);

        $stock = Stock::where('item_variant_id', $this->variant->id)->first();
        // (10*4 + 10*6) / 20 = 5
        $this->assertEquals(20.0, (float) $stock->on_hand);
        $this->assertEquals(5.0, (float) $stock->weighted_avg_cost);
    }

    #[Test]
    public function a_null_cost_leaves_the_weighted_average_untouched(): void
    {
        Stock::create([
            'inventory_location_id' => $this->location->id,
            'item_variant_id' => $this->variant->id,
            'on_hand' => 10,
            'reserved' => 0,
            'weighted_avg_cost' => 4,
        ]);

        $this->postEntry(['unitCost' => null, 'sourceLineId' => 7, 'line' => null]);

        $stock = Stock::where('item_variant_id', $this->variant->id)->first();
        $this->assertEquals(20.0, (float) $stock->on_hand);
        $this->assertEquals(4.0, (float) $stock->weighted_avg_cost);
    }

    #[Test]
    public function an_explicit_zero_cost_still_blends(): void
    {
        Stock::create([
            'inventory_location_id' => $this->location->id,
            'item_variant_id' => $this->variant->id,
            'on_hand' => 10,
            'reserved' => 0,
            'weighted_avg_cost' => 100,
        ]);

        $this->postEntry(['unitCost' => 0.0, 'sourceLineId' => 7, 'line' => null]);

        $stock = Stock::where('item_variant_id', $this->variant->id)->first();
        // (10*100 + 10*0) / 20 = 50
        $this->assertEquals(50.0, (float) $stock->weighted_avg_cost);
    }

    #[Test]
    public function replaying_the_same_source_line_returns_the_original_movement_and_does_not_double_count(): void
    {
        $first = $this->postEntry();
        $second = $this->postEntry();

        $this->assertSame($first->id, $second->id);
        $this->assertSame(1, StockMovement::where('related_id', 100)->where('related_line_id', 1)->count());

        $stock = Stock::where('item_variant_id', $this->variant->id)->first();
        $this->assertEquals(10.0, (float) $stock->on_hand);
    }

    #[Test]
    public function the_fast_path_returns_an_already_posted_duplicate_before_attempting_an_insert(): void
    {
        // Stand in for a concurrent caller that already committed the movement
        // for this source line. post() must return it and leave Stock alone.
        $winner = $this->winningMovement();

        $result = $this->postEntry();

        $this->assertSame($winner->id, $result->id);
        $this->assertNull(
            Stock::where('item_variant_id', $this->variant->id)->first(),
            'A recovered duplicate must not create or increment Stock.'
        );
    }

    #[Test]
    public function it_recovers_the_winner_from_a_savepoint_when_the_insert_loses_the_uniqueness_race(): void
    {
        // Exercises the true concurrent path: the fast pre-check missed (a
        // concurrent caller had not committed yet), so createMovementOrRecover-
        // Duplicate() attempts the INSERT and it loses the race. Without the
        // savepoint, Postgres would abort the whole enclosing transaction and
        // the recovery query would fail with "current transaction is aborted".
        $winner = $this->winningMovement();

        $recovered = DB::transaction(function () use ($winner) {
            $result = $this->service->createMovementOrRecoverDuplicate($this->data());

            $this->assertSame($winner->id, $result->id);
            $this->assertFalse($result->wasRecentlyCreated);

            // Proves the outer transaction survived the failed INSERT — this
            // query is exactly what threw before the savepoint fix.
            $this->assertSame(1, StockMovement::where('related_id', 100)->count());

            return $result;
        });

        $this->assertSame($winner->id, $recovered->id);
        $this->assertNull(Stock::where('item_variant_id', $this->variant->id)->first());
    }

    #[Test]
    public function create_movement_or_recover_duplicate_inserts_a_fresh_row_when_no_duplicate_exists(): void
    {
        $movement = DB::transaction(fn () => $this->service->createMovementOrRecoverDuplicate($this->data(['line' => null])));

        $this->assertTrue($movement->wasRecentlyCreated);
        $this->assertSame(1, (int) $movement->related_line_id);
    }

    #[Test]
    public function post_does_not_touch_stock_when_the_insert_recovered_a_concurrent_duplicate(): void
    {
        $winner = $this->winningMovement()->fresh(); // fetched, so wasRecentlyCreated === false

        // The fast pre-check keys on (sourceId, sourceLineId) that don't match
        // the winner, so post() falls through to createMovementOrRecover-
        // Duplicate(); stub it to return the recovered winner (the true-race
        // outcome) and assert post() returns it without ever calling
        // receiveInto().
        $spy = Mockery::mock(
            InventoryEntryPostingService::class.'[createMovementOrRecoverDuplicate]',
            [app(StockMutationService::class)]
        );
        $spy->shouldReceive('createMovementOrRecoverDuplicate')->once()->andReturn($winner);

        $result = DB::transaction(fn () => $spy->post($this->data(['sourceId' => 999, 'sourceLineId' => 42])));

        $this->assertSame($winner->id, $result->id);
        $this->assertNull(Stock::where('item_variant_id', $this->variant->id)->first());
    }

    private function winningMovement(): StockMovement
    {
        return StockMovement::create([
            'to_location_id' => $this->location->id,
            'item_variant_id' => $this->variant->id,
            'user_id' => $this->user->id,
            'qty' => 10,
            'reason' => StockMovement::REASON_PURCHASE_RECEIPT,
            'status' => StockMovement::STATUS_POSTED,
            'related_type' => Receipt::class,
            'related_id' => 100,
            'related_line_id' => 1,
            'meta' => [],
            'posted_at' => now(),
        ]);
    }

    #[Test]
    public function two_lines_from_the_same_receipt_post_independently(): void
    {
        $this->postEntry(['sourceLineId' => 1, 'line' => null]);
        $this->postEntry(['sourceLineId' => 2, 'baseQuantity' => 4.0, 'unitCost' => 5.0, 'line' => null]);

        $this->assertSame(2, StockMovement::where('related_id', 100)->count());
        $this->assertEquals(14.0, (float) Stock::where('item_variant_id', $this->variant->id)->value('on_hand'));
    }

    #[Test]
    public function a_manual_entry_without_a_source_line_has_no_idempotency_contract(): void
    {
        $a = $this->postEntry(['sourceType' => null, 'sourceId' => null, 'sourceLineId' => null, 'reason' => StockMovement::REASON_OPENING_BALANCE, 'line' => null]);
        $b = $this->postEntry(['sourceType' => null, 'sourceId' => null, 'sourceLineId' => null, 'reason' => StockMovement::REASON_OPENING_BALANCE, 'line' => null]);

        $this->assertNotSame($a->id, $b->id);
        $this->assertEquals(20.0, (float) Stock::where('item_variant_id', $this->variant->id)->value('on_hand'));
    }

    #[Test]
    public function a_failure_after_the_movement_rolls_back_stock_cost_movement_and_line_together(): void
    {
        try {
            DB::transaction(function () {
                $this->service->post($this->data(['line' => null]));

                throw new RuntimeException('caller aborts the document');
            });
        } catch (RuntimeException) {
            // expected
        }

        $this->assertSame(0, StockMovement::count());
        $this->assertSame(0, DB::table('stock_movement_lines')->count());
        $this->assertNull(Stock::where('item_variant_id', $this->variant->id)->first());
    }
}
