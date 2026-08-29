<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Schema;

/**
 * #442 (Milestone C) — final removal of the superseded per-Variant cost and
 * price columns. `min_stock`/`max_stock` were already dropped by #439
 * (2026_08_26_210500_move_variant_stock_thresholds_to_location_policies); this
 * completes the set.
 *
 * - `sale_price`      → superseded by effective-dated price lists (#435,
 *                       VariantPrice + PriceResolutionService). Application
 *                       code has not read it since #429/#435.
 * - `avg_unit_cost`   → superseded by Stock.weighted_avg_cost, scoped per
 *   `last_unit_cost`     Inventory Location (#434). Both were reconciled and
 *                       frozen read-only by
 *                       2026_08_25_030000_reconcile_item_variant_weighted_average_cost;
 *                       nothing has written them since.
 *
 * Non-lossy, non-exposing drop: before dropping, up() copies the exact
 * pre-drop value of all three columns for every row carrying a non-default
 * value into a dedicated internal table, `item_variant_legacy_cost_archive`.
 * That table is never referenced by a model, controller, resource or route,
 * so — unlike stashing the values back into `item_variants.meta`, which the
 * `/item-variants` list endpoint serializes verbatim to any `items.view`
 * caller — the archived prices/costs are not reachable through the public API.
 * down() re-adds the columns, restores every archived row verbatim, applies a
 * best-effort `avg_unit_cost` from the on-hand-weighted Stock.weighted_avg_cost
 * rollup only for rows created after up() ran, and drops the archive table so
 * it is a true inverse of up().
 */
return new class extends Migration
{
    private const ARCHIVE_TABLE = 'item_variant_legacy_cost_archive';

    public function up(): void
    {
        Schema::create(self::ARCHIVE_TABLE, function (Blueprint $table) {
            $table->unsignedBigInteger('item_variant_id')->primary();
            $table->decimal('sale_price', 15, 4)->nullable();
            $table->decimal('last_unit_cost', 15, 4)->nullable();
            $table->decimal('avg_unit_cost', 15, 4)->nullable();
            $table->timestamp('archived_at')->useCurrent();
        });

        $legacyRows = DB::table('item_variants')
            ->where(function ($query) {
                $query->whereNotNull('sale_price')
                    ->orWhere('last_unit_cost', '<>', 0)
                    ->orWhere('avg_unit_cost', '<>', 0);
            })
            ->select('id as item_variant_id', 'sale_price', 'last_unit_cost', 'avg_unit_cost')
            ->get();

        $now = now();
        foreach ($legacyRows->chunk(500) as $chunk) {
            DB::table(self::ARCHIVE_TABLE)->insert(
                $chunk->map(fn ($row) => (array) $row + ['archived_at' => $now])->all()
            );
        }

        Log::info('#442: archived pre-drop legacy cost/price values, then dropping the columns', [
            'item_variants_total' => DB::table('item_variants')->count(),
            'rows_archived' => $legacyRows->count(),
            'archive_table' => self::ARCHIVE_TABLE.' (internal — no model/route/resource references it)',
            'authoritative_replacements' => 'VariantPrice (#435), Stock.weighted_avg_cost (#434)',
        ]);

        Schema::table('item_variants', function (Blueprint $table) {
            $table->dropColumn(['sale_price', 'last_unit_cost', 'avg_unit_cost']);
        });
    }

    public function down(): void
    {
        Schema::table('item_variants', function (Blueprint $table) {
            $table->decimal('last_unit_cost', 15, 4)->default(0)->after('track_serial')->comment('Last acquisition cost per base unit');
            $table->decimal('avg_unit_cost', 15, 4)->default(0)->after('last_unit_cost')->comment('Weighted average cost per base unit');
            $table->decimal('sale_price', 15, 4)->nullable()->after('avg_unit_cost')->comment('Default sale price');
        });

        // 1. Exact restore for every row up() archived before the drop.
        $restoredIds = [];
        if (Schema::hasTable(self::ARCHIVE_TABLE)) {
            foreach (DB::table(self::ARCHIVE_TABLE)->get() as $row) {
                DB::table('item_variants')
                    ->where('id', $row->item_variant_id)
                    ->update([
                        'sale_price' => $row->sale_price,
                        'last_unit_cost' => $row->last_unit_cost ?? 0,
                        'avg_unit_cost' => $row->avg_unit_cost ?? 0,
                    ]);

                $restoredIds[] = $row->item_variant_id;
            }
        }

        // 2. Best-effort avg_unit_cost for rows never archived (created after up()
        //    ran) — from the on-hand-weighted rollup of the per-location
        //    Stock.weighted_avg_cost, the authoritative source since #434.
        $rollups = DB::table('stock')
            ->select('item_variant_id')
            ->selectRaw('SUM(on_hand * weighted_avg_cost) as weighted_value')
            ->selectRaw('SUM(on_hand) as total_on_hand')
            ->when($restoredIds !== [], fn ($query) => $query->whereNotIn('item_variant_id', $restoredIds))
            ->groupBy('item_variant_id')
            ->havingRaw('SUM(on_hand) > 0')
            ->get();

        foreach ($rollups as $rollup) {
            DB::table('item_variants')
                ->where('id', $rollup->item_variant_id)
                ->update(['avg_unit_cost' => $rollup->weighted_value / $rollup->total_on_hand]);
        }

        Schema::dropIfExists(self::ARCHIVE_TABLE);

        Log::warning('#442 rollback: re-added legacy item_variants cost/price columns; dropped the archive table', [
            'rows_restored_exactly_from_archive' => count($restoredIds),
            'rows_avg_cost_best_effort_from_stock' => $rollups->count(),
        ]);
    }
};
