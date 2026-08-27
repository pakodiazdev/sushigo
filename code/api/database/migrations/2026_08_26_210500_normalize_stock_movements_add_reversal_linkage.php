<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * #438 — Normalize the Stock Movement contract and add immutable
 * compensating reversals.
 *
 * Non-destructive: this migration hardens the existing contract rather than
 * removing the (now formally redundant) header/line duplication — that
 * removal is owned by #442 per the Sprint 006 sequencing, which only drops
 * legacy schema once every replacement consumer and reconciliation check
 * exists.
 *
 * What it adds:
 *  - Causal reversal linkage on stock_movements: a compensating movement
 *    points at the movement it reverses (reverses_stock_movement_id), and
 *    that column is UNIQUE so a posted movement can be reversed at most once
 *    ("restores the affected balance exactly once").
 *  - Audit columns on the original being reversed: reversed_at,
 *    reversed_by_user_id, reversal_reason.
 *  - A positive-quantity CHECK on stock_movements.qty and on
 *    stock_movement_lines.qty / base_qty — a structural net under the
 *    application-layer invariant guard.
 *  - A UNIQUE index on stock_movement_lines.stock_movement_id — the
 *    structural half of the single-line decision (a movement carries at most
 *    one line).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('stock_movements', function (Blueprint $table) {
            $table->foreignId('reverses_stock_movement_id')
                ->nullable()
                ->after('related_type')
                ->constrained('stock_movements')
                ->nullOnDelete()
                ->comment('The posted movement this row compensates (reversal linkage)');

            $table->foreignId('reversed_by_user_id')
                ->nullable()
                ->after('reverses_stock_movement_id')
                ->constrained('users')
                ->nullOnDelete()
                ->comment('User who reversed this movement');

            $table->timestamp('reversed_at')
                ->nullable()
                ->after('reversed_by_user_id')
                ->comment('When this movement was reversed');

            $table->text('reversal_reason')
                ->nullable()
                ->after('reversed_at')
                ->comment('Why this movement was reversed / why the compensating movement exists');

            // A posted movement can be compensated at most once.
            $table->unique('reverses_stock_movement_id');
        });

        // Structural net under the application-layer invariant guard.
        DB::statement('ALTER TABLE stock_movements ADD CONSTRAINT stock_movements_qty_positive_check CHECK (qty > 0)');

        Schema::table('stock_movement_lines', function (Blueprint $table) {
            // The structural half of the single-line contract: a movement
            // carries at most one line, and that line cannot disagree with
            // the header (enforced in the model layer).
            $table->unique('stock_movement_id');
        });

        DB::statement('ALTER TABLE stock_movement_lines ADD CONSTRAINT stock_movement_lines_qty_positive_check CHECK (qty > 0)');
        DB::statement('ALTER TABLE stock_movement_lines ADD CONSTRAINT stock_movement_lines_base_qty_positive_check CHECK (base_qty > 0)');
    }

    public function down(): void
    {
        DB::statement('ALTER TABLE stock_movement_lines DROP CONSTRAINT IF EXISTS stock_movement_lines_base_qty_positive_check');
        DB::statement('ALTER TABLE stock_movement_lines DROP CONSTRAINT IF EXISTS stock_movement_lines_qty_positive_check');

        Schema::table('stock_movement_lines', function (Blueprint $table) {
            $table->dropUnique('stock_movement_lines_stock_movement_id_unique');
        });

        DB::statement('ALTER TABLE stock_movements DROP CONSTRAINT IF EXISTS stock_movements_qty_positive_check');

        Schema::table('stock_movements', function (Blueprint $table) {
            $table->dropUnique('stock_movements_reverses_stock_movement_id_unique');
            $table->dropConstrainedForeignId('reverses_stock_movement_id');
            $table->dropConstrainedForeignId('reversed_by_user_id');
            $table->dropColumn(['reversed_at', 'reversal_reason']);
        });
    }
};
