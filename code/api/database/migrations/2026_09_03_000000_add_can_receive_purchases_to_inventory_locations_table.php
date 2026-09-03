<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * #568 — Make an Inventory Location's ability to receive supplier purchases an
 * explicit persisted capability instead of an inferred `type === MAIN` check.
 *
 * The column-add is guarded by `hasColumn()` so the deterministic backfill step
 * below can be re-run on its own (the #568 backfill test drives `up()` directly
 * against rows that already existed before this migration). The backfill only
 * flips locations that are, today, unambiguously the primary receiving point:
 * active + primary + `type = MAIN` + not soft-deleted. Everything else stays
 * `false` until a user explicitly opts it in. No Receipt/Stock/StockMovement
 * row is read or rewritten.
 */
return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasColumn('inventory_locations', 'can_receive_purchases')) {
            Schema::table('inventory_locations', function (Blueprint $table) {
                $table->boolean('can_receive_purchases')
                    ->default(false)
                    ->after('is_active')
                    ->comment('Whether supplier purchases may be received into this location (#568)');

                $table->index(
                    ['operating_unit_id', 'can_receive_purchases'],
                    'idx_inv_loc_ou_can_receive',
                );
            });
        }

        // Conservative, deterministic backfill — see the class docblock.
        DB::table('inventory_locations')
            ->where('type', 'MAIN')
            ->where('is_active', true)
            ->where('is_primary', true)
            ->whereNull('deleted_at')
            ->update(['can_receive_purchases' => true]);
    }

    public function down(): void
    {
        Schema::table('inventory_locations', function (Blueprint $table) {
            $table->dropIndex('idx_inv_loc_ou_can_receive');
            $table->dropColumn('can_receive_purchases');
        });
    }
};
