<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // decimal(26,4): on_hand and weighted_avg_cost are each decimal(15,4)
        // (11 integer digits), so their product can need up to 22 integer
        // digits even when each factor individually fits its own column
        // (e.g. on_hand = weighted_avg_cost = 99999999999.9999, the maximum
        // each column allows, produces ~9.99999999999998e21) — 22 integer
        // digits plus the 4 fractional digits this column retains.
        Schema::table('stock', function (Blueprint $table) {
            $table->decimal('total_value', 26, 4)->default(0)->after('weighted_avg_cost')
                ->comment('Exact running value accumulator (#579) — on_hand * weighted_avg_cost, maintained additively so reversing a prior contribution never reconstructs it from the already-rounded weighted_avg_cost column.');
        });

        // Backfill by summing the immutable movement ledger's own evidence — not
        // `on_hand * weighted_avg_cost` (the stored average is a rounded, display-only
        // rate; reconstructing from it can already disagree with the sum of what was
        // actually posted, defeating the whole point of an *exact* accumulator for
        // rows that predate it). Every current writer (Receipt, Opening Balance,
        // Transfer, Stock Out, and — as of #579 — a generic StockMovementReverser
        // reversal) records a `stock_movement_lines.line_total`, signed by whether
        // this Stock row is the movement's destination (+) or source (-); POSTED and
        // REVERSED movements both count (a reversed movement's own effect still
        // happened — its *separate*, later compensating movement is what undoes it,
        // contributing the offsetting sign), so an original and its compensating
        // reversal net to exactly zero. Only a Stock row with no movement evidence at
        // all (e.g. seeded directly, bypassing every posting service) falls back to
        // the previous approximation.
        //
        // Inbound and outbound lines are not recorded on the same valuation basis:
        // a Receipt's line_total is its exact acquisition total, while
        // StockOutService's is baseQuantity * the already scale-4-rounded
        // weighted_avg_cost. A legacy full depletion can therefore net to a tiny
        // negative residual purely from that rounding mismatch (e.g. a 240-unit
        // receipt worth exactly 1000 followed by a 240-unit stock-out at WAC
        // 4.1667 nets 1000.0000 - 1000.0080 = -0.0080), which the nonnegative
        // CHECK constraint below would reject. GREATEST(..., 0) reconciles that
        // rounding residual against the current balance the same way the runtime
        // accumulator itself never goes negative (Stock::decreaseOnHand()).
        DB::statement(<<<'SQL'
            UPDATE stock s
            SET total_value = GREATEST(COALESCE((
                SELECT SUM(
                    CASE
                        WHEN sm.to_location_id = s.inventory_location_id THEN sml.line_total
                        WHEN sm.from_location_id = s.inventory_location_id THEN -sml.line_total
                        ELSE 0
                    END
                )
                FROM stock_movements sm
                INNER JOIN stock_movement_lines sml ON sml.stock_movement_id = sm.id
                WHERE sm.item_variant_id = s.item_variant_id
                  AND sm.status IN ('POSTED', 'REVERSED')
                  AND sml.line_total IS NOT NULL
                  AND (sm.to_location_id = s.inventory_location_id OR sm.from_location_id = s.inventory_location_id)
            ), ROUND(s.on_hand * s.weighted_avg_cost, 4)), 0)
        SQL);

        // Same NOT VALID + VALIDATE pattern as the on_hand/reserved invariants
        // (2026_08_12_210000): enforced on every write from here on without an
        // ACCESS EXCLUSIVE scan up front, then validated against the just-backfilled
        // rows under a lighter SHARE UPDATE EXCLUSIVE lock.
        DB::statement('ALTER TABLE stock ADD CONSTRAINT stock_total_value_nonnegative CHECK (total_value >= 0) NOT VALID');
        DB::statement('ALTER TABLE stock VALIDATE CONSTRAINT stock_total_value_nonnegative');
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        DB::statement('ALTER TABLE stock DROP CONSTRAINT IF EXISTS stock_total_value_nonnegative');

        Schema::table('stock', function (Blueprint $table) {
            $table->dropColumn('total_value');
        });
    }
};
