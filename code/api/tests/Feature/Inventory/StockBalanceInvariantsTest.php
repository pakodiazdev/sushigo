<?php

namespace Tests\Feature\Inventory;

use App\Models\Stock;
use Illuminate\Database\QueryException;
use PHPUnit\Framework\Attributes\Test;

/**
 * Database-layer backstop for the on_hand/reserved invariants — proves the
 * CHECK constraints reject an invalid balance even for a caller that bypasses
 * every application-layer guard (StockMutationService, the Stock model
 * methods, HTTP FormRequest validation) entirely with a raw write.
 */
class StockBalanceInvariantsTest extends InventoryTestCase
{
    #[Test]
    public function it_rejects_a_negative_on_hand_at_the_database_layer(): void
    {
        $item = $this->createItem();
        $variant = $this->createItemVariant($item);

        $this->expectException(QueryException::class);

        Stock::create([
            'inventory_location_id' => $this->location->id,
            'item_variant_id' => $variant->id,
            'on_hand' => -1,
            'reserved' => 0,
        ]);
    }

    #[Test]
    public function it_rejects_a_negative_reserved_at_the_database_layer(): void
    {
        $item = $this->createItem();
        $variant = $this->createItemVariant($item);

        $this->expectException(QueryException::class);

        Stock::create([
            'inventory_location_id' => $this->location->id,
            'item_variant_id' => $variant->id,
            'on_hand' => 10,
            'reserved' => -1,
        ]);
    }

    #[Test]
    public function it_rejects_reserved_exceeding_on_hand_at_the_database_layer(): void
    {
        $item = $this->createItem();
        $variant = $this->createItemVariant($item);

        $this->expectException(QueryException::class);

        Stock::create([
            'inventory_location_id' => $this->location->id,
            'item_variant_id' => $variant->id,
            'on_hand' => 5,
            'reserved' => 6,
        ]);
    }

    #[Test]
    public function it_allows_reserved_equal_to_on_hand(): void
    {
        $item = $this->createItem();
        $variant = $this->createItemVariant($item);

        $stock = Stock::create([
            'inventory_location_id' => $this->location->id,
            'item_variant_id' => $variant->id,
            'on_hand' => 5,
            'reserved' => 5,
        ])->fresh();

        // ->fresh() is required here: `available` is a DB-computed column,
        // so the in-memory instance from create() never had it populated —
        // asserting against it directly would vacuously compare null.
        $this->assertEquals(0, (float) $stock->available);
    }
}
