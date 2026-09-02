<?php

namespace Tests\Feature\Inventory;

use App\Models\ItemVariant;
use App\Models\Receipt;
use App\Models\StockMovement;
use Illuminate\Database\QueryException;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;
use PHPUnit\Framework\Attributes\Test;

/**
 * #567 — source-line identity column, its partial UNIQUE backstop, and the
 * non-destructive backfill of pre-existing Purchase Receipt movements.
 */
class StockMovementSourceLineIdentityMigrationTest extends InventoryTestCase
{
    private const MIGRATION = 'database/migrations/2026_09_01_000000_add_source_line_identity_to_stock_movements.php';

    private ItemVariant $variant;

    protected function setUp(): void
    {
        parent::setUp();
        $this->variant = $this->createItemVariant($this->createItem());
    }

    private function postedEntry(array $overrides = []): StockMovement
    {
        return StockMovement::create(array_merge([
            'from_location_id' => null,
            'to_location_id' => $this->location->id,
            'item_variant_id' => $this->variant->id,
            'user_id' => $this->user->id,
            'qty' => 10,
            'reason' => StockMovement::REASON_PURCHASE_RECEIPT,
            'status' => StockMovement::STATUS_POSTED,
            'related_type' => Receipt::class,
            'related_id' => 4321,
            'related_line_id' => 99,
            'meta' => [],
            'posted_at' => now(),
        ], $overrides));
    }

    #[Test]
    public function the_source_line_column_and_indexes_exist_after_migrating(): void
    {
        $this->assertTrue(Schema::hasColumn('stock_movements', 'related_line_id'));

        $indexes = collect(DB::select('SELECT indexname FROM pg_indexes WHERE tablename = ?', ['stock_movements']))
            ->pluck('indexname');

        $this->assertContains('stock_movements_source_line_unique', $indexes);
        $this->assertContains('stock_movements_source_line_index', $indexes);
    }

    #[Test]
    public function a_second_live_posted_movement_for_the_same_source_line_and_reason_is_rejected(): void
    {
        $this->postedEntry();

        $this->expectException(QueryException::class);

        $this->postedEntry();
    }

    #[Test]
    public function two_lines_from_the_same_source_document_post_independently(): void
    {
        $this->postedEntry(['related_line_id' => 1]);
        $this->postedEntry(['related_line_id' => 2]);

        $this->assertSame(2, StockMovement::where('related_id', 4321)->count());
    }

    #[Test]
    public function the_same_source_line_may_carry_one_movement_per_reason(): void
    {
        $this->postedEntry(['reason' => StockMovement::REASON_PURCHASE_RECEIPT]);
        // A compensating reversal shares the document line but a different
        // reason — the partial unique key includes `reason`, so it fits.
        $this->postedEntry([
            'reason' => StockMovement::REASON_PURCHASE_RECEIPT_REVERSAL,
            'from_location_id' => $this->location->id,
            'to_location_id' => null,
        ]);

        $this->assertSame(2, StockMovement::where('related_id', 4321)->where('related_line_id', 99)->count());
    }

    #[Test]
    public function manual_movements_without_a_source_line_are_never_constrained(): void
    {
        $this->postedEntry(['related_type' => null, 'related_id' => null, 'related_line_id' => null, 'reason' => StockMovement::REASON_OPENING_BALANCE]);
        $this->postedEntry(['related_type' => null, 'related_id' => null, 'related_line_id' => null, 'reason' => StockMovement::REASON_OPENING_BALANCE]);

        $this->assertSame(2, StockMovement::whereNull('related_line_id')->count());
    }

    #[Test]
    public function a_reversed_movement_frees_the_source_line_slot(): void
    {
        $original = $this->postedEntry();
        $original->forceFill(['status' => StockMovement::STATUS_REVERSED, 'reversed_at' => now()])->save();

        // Same source line + reason again — allowed because the prior row is no
        // longer a *live* POSTED movement.
        $this->postedEntry();

        $this->assertSame(1, StockMovement::where('related_id', 4321)->where('status', StockMovement::STATUS_POSTED)->count());
    }

    #[Test]
    public function it_backfills_related_line_id_from_meta_on_existing_receipt_movements(): void
    {
        // Rewind to the pre-#567 schema, seed a legacy row that only carried
        // the line key in meta, then replay the migration.
        DB::statement('DROP INDEX IF EXISTS stock_movements_source_line_unique');
        Schema::table('stock_movements', function ($table) {
            $table->dropIndex('stock_movements_source_line_index');
            $table->dropColumn('related_line_id');
        });

        $legacyId = DB::table('stock_movements')->insertGetId([
            'public_id' => (string) Str::ulid(),
            'from_location_id' => null,
            'to_location_id' => $this->location->id,
            'item_variant_id' => $this->variant->id,
            'user_id' => $this->user->id,
            'qty' => 12,
            'reason' => StockMovement::REASON_PURCHASE_RECEIPT,
            'status' => StockMovement::STATUS_POSTED,
            'related_type' => Receipt::class,
            'related_id' => 777,
            'meta' => json_encode(['receipt_line_id' => 55]),
            'posted_at' => now(),
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        (require base_path(self::MIGRATION))->up();

        $this->assertSame(55, (int) DB::table('stock_movements')->where('id', $legacyId)->value('related_line_id'));
    }

    #[Test]
    public function existing_receipt_movements_without_the_meta_key_stay_null_and_valid(): void
    {
        DB::statement('DROP INDEX IF EXISTS stock_movements_source_line_unique');
        Schema::table('stock_movements', function ($table) {
            $table->dropIndex('stock_movements_source_line_index');
            $table->dropColumn('related_line_id');
        });

        $id = DB::table('stock_movements')->insertGetId([
            'public_id' => (string) Str::ulid(),
            'to_location_id' => $this->location->id,
            'item_variant_id' => $this->variant->id,
            'qty' => 3,
            'reason' => StockMovement::REASON_OPENING_BALANCE,
            'status' => StockMovement::STATUS_POSTED,
            'meta' => json_encode(['original_qty' => 3]),
            'posted_at' => now(),
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        (require base_path(self::MIGRATION))->up();

        $this->assertNull(DB::table('stock_movements')->where('id', $id)->value('related_line_id'));
    }

    #[Test]
    public function the_migration_is_reversible(): void
    {
        (require base_path(self::MIGRATION))->down();

        $this->assertFalse(Schema::hasColumn('stock_movements', 'related_line_id'));

        (require base_path(self::MIGRATION))->up();

        $this->assertTrue(Schema::hasColumn('stock_movements', 'related_line_id'));
    }

    #[Test]
    public function rolling_back_restores_the_receipt_line_key_into_meta_for_movements_posted_under_this_schema(): void
    {
        // A Receipt movement the #567 code path posted: line key lives only in
        // related_line_id, not in meta.
        $movement = $this->postedEntry(['related_line_id' => 99, 'meta' => ['received_packages' => 3.0]]);

        (require base_path(self::MIGRATION))->down();

        $meta = json_decode(DB::table('stock_movements')->where('id', $movement->id)->value('meta'), true);

        // The pre-#567 ReceiptService resolves the movement to reverse by this key.
        $this->assertSame(99, $meta['receipt_line_id']);
        // Existing meta is preserved, not overwritten.
        $this->assertEqualsWithDelta(3.0, $meta['received_packages'], 0.0001);
    }

    #[Test]
    public function rolling_back_does_not_touch_a_movement_that_already_carries_the_meta_key(): void
    {
        $movement = $this->postedEntry([
            'related_line_id' => 99,
            'meta' => ['receipt_line_id' => 5, 'note' => 'legacy'],
        ]);

        (require base_path(self::MIGRATION))->down();

        $meta = json_decode(DB::table('stock_movements')->where('id', $movement->id)->value('meta'), true);

        $this->assertSame(5, $meta['receipt_line_id']); // untouched, not overwritten with related_line_id
        $this->assertSame('legacy', $meta['note']);
    }
}
