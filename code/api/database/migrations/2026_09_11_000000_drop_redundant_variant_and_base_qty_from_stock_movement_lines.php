<?php

use App\Exceptions\StockMovementLineHeaderMismatchException;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * #575 — `stock_movement_lines.item_variant_id` and `.base_qty` duplicate the
 * normalized `StockMovement` header's own `item_variant_id`/`qty` (#438
 * single-line contract). Every writer (StockOutService, ReceiptService,
 * InventoryEntryPostingService, StockTransferService) has always set the two
 * line values from the exact same variable used for the sibling header
 * field, and `StockMovementLine::assertAgreesWithHeader()` has enforced their
 * equality at save time since #438 — so no row persisted through Eloquent can
 * disagree.
 *
 * Unlike #442's `item_variants` cost/price columns, this pair is 100%
 * losslessly reconstructable from the header via its own FK
 * (`stock_movement_id`), so no archive table is needed: down() backfills by
 * joining straight back to `stock_movements`.
 *
 * up() still reconciles the live data before dropping, per the issue's
 * explicit ask, and aborts with actionable evidence (the disagreeing line
 * ids) instead of silently losing data if anything disagrees — the same
 * "abort before touching schema" shape as
 * 2026_07_20_000001_drop_name_columns_from_employees_table.php.
 */
return new class extends Migration
{
    public function up(): void
    {
        // Exact equality, not a tolerance — line.base_qty and header.qty are both
        // Postgres decimal(15,4) columns compared directly in SQL, an exact
        // numeric type with no floating-point drift. The old model guard used a
        // 0.0001 epsilon because it compared PHP floats; reusing that tolerance
        // here would let a real one-representable-unit disagreement (exactly
        // 0.0001 apart) pass reconciliation and have its distinct value silently
        // dropped, defeating the "lossless" claim.
        $mismatchedIds = DB::table('stock_movement_lines as line')
            ->join('stock_movements as header', 'header.id', '=', 'line.stock_movement_id')
            ->where(function ($query) {
                $query->whereColumn('line.item_variant_id', '!=', 'header.item_variant_id')
                    ->orWhereColumn('line.base_qty', '!=', 'header.qty');
            })
            ->pluck('line.id');

        if ($mismatchedIds->isNotEmpty()) {
            throw new StockMovementLineHeaderMismatchException(
                'Cannot drop stock_movement_lines.item_variant_id/base_qty: '
                .$mismatchedIds->count().' line(s) disagree with their header '
                .'(line ids: '.$mismatchedIds->implode(', ').'). Reconcile these rows '
                .'before running this migration.'
            );
        }

        DB::statement('ALTER TABLE stock_movement_lines DROP CONSTRAINT IF EXISTS stock_movement_lines_base_qty_positive_check');

        Schema::table('stock_movement_lines', function (Blueprint $table) {
            $table->dropIndex(['item_variant_id']);
            $table->dropConstrainedForeignId('item_variant_id');
            $table->dropColumn('base_qty');
        });
    }

    public function down(): void
    {
        Schema::table('stock_movement_lines', function (Blueprint $table) {
            $table->foreignId('item_variant_id')->nullable()->after('stock_movement_id')
                ->constrained('item_variants')->cascadeOnDelete()
                ->comment('Item variant in this line');
            $table->decimal('base_qty', 15, 4)->nullable()->after('qty')
                ->comment('Quantity converted to base unit');
        });

        DB::statement('
            UPDATE stock_movement_lines AS line
            SET item_variant_id = header.item_variant_id,
                base_qty = header.qty
            FROM stock_movements AS header
            WHERE header.id = line.stock_movement_id
        ');

        DB::statement('ALTER TABLE stock_movement_lines ALTER COLUMN item_variant_id SET NOT NULL');
        DB::statement('ALTER TABLE stock_movement_lines ALTER COLUMN base_qty SET NOT NULL');

        Schema::table('stock_movement_lines', function (Blueprint $table) {
            $table->index(['item_variant_id']);
        });

        DB::statement('ALTER TABLE stock_movement_lines ADD CONSTRAINT stock_movement_lines_base_qty_positive_check CHECK (base_qty > 0)');
    }
};
