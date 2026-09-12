<?php

namespace Tests\Feature\Inventory;

use App\Exceptions\StockMovementLineHeaderMismatchException;
use App\Models\ItemVariant;
use App\Models\StockMovement;
use App\Models\StockMovementLine;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;
use PHPUnit\Framework\Attributes\Test;

/**
 * #575 — `stock_movement_lines.item_variant_id` and `.base_qty` are dropped
 * as redundant with the `StockMovement` header's own `item_variant_id`/`qty`.
 * The reconciliation guard in up() and the lossless header-derived down() are
 * exercised by driving the migration object directly, the same approach as
 * StockMovementSourceLineIdentityMigrationTest.
 */
class StockMovementLineColumnRemovalMigrationTest extends InventoryTestCase
{
    private const MIGRATION = 'database/migrations/2026_09_11_000000_drop_redundant_variant_and_base_qty_from_stock_movement_lines.php';

    private ItemVariant $variant;

    protected function setUp(): void
    {
        parent::setUp();
        $this->variant = $this->createItemVariant($this->createItem());
    }

    #[Test]
    public function the_columns_index_fk_and_check_constraint_are_gone_after_migrating(): void
    {
        $this->assertFalse(Schema::hasColumn('stock_movement_lines', 'item_variant_id'));
        $this->assertFalse(Schema::hasColumn('stock_movement_lines', 'base_qty'));

        $constraints = collect(DB::select(
            "SELECT conname FROM pg_constraint WHERE conrelid = 'stock_movement_lines'::regclass"
        ))->pluck('conname');

        $this->assertNotContains('stock_movement_lines_base_qty_positive_check', $constraints);
        $this->assertNotContains('stock_movement_lines_item_variant_id_foreign', $constraints);

        $indexes = collect(DB::select('SELECT indexname FROM pg_indexes WHERE tablename = ?', ['stock_movement_lines']))
            ->pluck('indexname');

        $this->assertNotContains('stock_movement_lines_item_variant_id_index', $indexes);
        // The retained qty positive-CHECK is untouched.
        $this->assertContains('stock_movement_lines_qty_positive_check', $constraints);
    }

    private function reAddPreDropColumns(): void
    {
        Schema::table('stock_movement_lines', function (Blueprint $table) {
            $table->foreignId('item_variant_id')->nullable()->after('stock_movement_id')
                ->constrained('item_variants')->cascadeOnDelete();
            $table->decimal('base_qty', 15, 4)->nullable()->after('qty');
            $table->index(['item_variant_id']);
        });
        DB::statement('ALTER TABLE stock_movement_lines ADD CONSTRAINT stock_movement_lines_base_qty_positive_check CHECK (base_qty > 0)');
    }

    private function postedMovementWithLegacyLine(float $qty, ?float $lineBaseQty = null, ?int $lineVariantId = null): StockMovement
    {
        $movement = StockMovement::create([
            'to_location_id' => $this->location->id,
            'item_variant_id' => $this->variant->id,
            'user_id' => $this->user->id,
            'qty' => $qty,
            'reason' => StockMovement::REASON_OPENING_BALANCE,
            'status' => StockMovement::STATUS_POSTED,
            'meta' => [],
            'posted_at' => now(),
        ]);

        DB::table('stock_movement_lines')->insert([
            'public_id' => (string) Str::ulid(),
            'stock_movement_id' => $movement->id,
            'item_variant_id' => $lineVariantId ?? $this->variant->id,
            'base_qty' => $lineBaseQty ?? $qty,
            'uom_id' => $this->uomKg->id,
            'qty' => $qty,
            'conversion_factor' => 1,
            'unit_cost' => 0,
            'line_total' => 0,
            'meta' => json_encode([]),
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        return $movement;
    }

    #[Test]
    public function up_aborts_with_actionable_evidence_when_a_line_disagrees_with_its_header(): void
    {
        $this->reAddPreDropColumns();

        $bad = $this->postedMovementWithLegacyLine(qty: 10, lineBaseQty: 7); // mismatched base_qty
        $this->postedMovementWithLegacyLine(qty: 5); // agrees — must not be blamed

        $badLineId = DB::table('stock_movement_lines')->where('stock_movement_id', $bad->id)->value('id');

        $migration = require base_path(self::MIGRATION);

        try {
            $migration->up();
            $this->fail('Expected a StockMovementLineHeaderMismatchException.');
        } catch (StockMovementLineHeaderMismatchException $e) {
            $this->assertStringContainsString((string) $badLineId, $e->getMessage());
        }

        // The abort happens before any schema change — nothing was dropped.
        $this->assertTrue(Schema::hasColumn('stock_movement_lines', 'item_variant_id'));
        $this->assertTrue(Schema::hasColumn('stock_movement_lines', 'base_qty'));
    }

    #[Test]
    public function up_aborts_on_a_one_representable_unit_base_qty_disagreement(): void
    {
        // decimal(15,4) columns compared directly in SQL are exact — a
        // difference of exactly 0.0001 (the smallest representable step) is a
        // real, distinct disagreement, not float noise, and must still abort.
        $this->reAddPreDropColumns();

        $bad = $this->postedMovementWithLegacyLine(qty: 10, lineBaseQty: 10.0001);
        $badLineId = DB::table('stock_movement_lines')->where('stock_movement_id', $bad->id)->value('id');

        $migration = require base_path(self::MIGRATION);

        try {
            $migration->up();
            $this->fail('Expected a StockMovementLineHeaderMismatchException.');
        } catch (StockMovementLineHeaderMismatchException $e) {
            $this->assertStringContainsString((string) $badLineId, $e->getMessage());
        }

        $this->assertTrue(Schema::hasColumn('stock_movement_lines', 'base_qty'));
    }

    #[Test]
    public function up_aborts_when_a_line_names_a_different_variant_than_its_header(): void
    {
        $this->reAddPreDropColumns();
        $otherVariant = $this->createItemVariant($this->createItem());

        $bad = $this->postedMovementWithLegacyLine(qty: 10, lineVariantId: $otherVariant->id);
        $badLineId = DB::table('stock_movement_lines')->where('stock_movement_id', $bad->id)->value('id');

        $migration = require base_path(self::MIGRATION);

        try {
            $migration->up();
            $this->fail('Expected a StockMovementLineHeaderMismatchException.');
        } catch (StockMovementLineHeaderMismatchException $e) {
            $this->assertStringContainsString((string) $badLineId, $e->getMessage());
        }
    }

    #[Test]
    public function up_drops_the_columns_when_every_line_agrees_with_its_header(): void
    {
        $this->reAddPreDropColumns();
        $this->postedMovementWithLegacyLine(qty: 10);
        $this->postedMovementWithLegacyLine(qty: 5);

        $migration = require base_path(self::MIGRATION);
        $migration->up();

        $this->assertFalse(Schema::hasColumn('stock_movement_lines', 'item_variant_id'));
        $this->assertFalse(Schema::hasColumn('stock_movement_lines', 'base_qty'));
    }

    #[Test]
    public function down_then_up_round_trips_without_losing_any_retained_line_data(): void
    {
        $movement = StockMovement::create([
            'to_location_id' => $this->location->id,
            'item_variant_id' => $this->variant->id,
            'user_id' => $this->user->id,
            'qty' => 8,
            'reason' => StockMovement::REASON_OPENING_BALANCE,
            'status' => StockMovement::STATUS_POSTED,
            'meta' => [],
            'posted_at' => now(),
        ]);

        StockMovementLine::create([
            'stock_movement_id' => $movement->id,
            'uom_id' => $this->uomKg->id,
            'qty' => 8,
            'conversion_factor' => 1,
            'unit_cost' => 12.5,
            'line_total' => 100,
            'meta' => ['note' => 'keep me'],
        ]);

        $migration = require base_path(self::MIGRATION);
        $migration->down();

        $this->assertTrue(Schema::hasColumn('stock_movement_lines', 'item_variant_id'));
        $this->assertTrue(Schema::hasColumn('stock_movement_lines', 'base_qty'));

        $row = DB::table('stock_movement_lines')->where('stock_movement_id', $movement->id)->first();
        $this->assertSame($this->variant->id, (int) $row->item_variant_id);
        $this->assertEqualsWithDelta(8.0, (float) $row->base_qty, 0.0001);
        // Retained fields are untouched by the round trip.
        $this->assertEqualsWithDelta(12.5, (float) $row->unit_cost, 0.0001);
        $this->assertSame(['note' => 'keep me'], json_decode($row->meta, true));

        $migration->up();

        $this->assertFalse(Schema::hasColumn('stock_movement_lines', 'item_variant_id'));
        $this->assertFalse(Schema::hasColumn('stock_movement_lines', 'base_qty'));
    }
}
