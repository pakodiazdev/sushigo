<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

/**
 * #434 reconciliation: ItemVariant.avg_unit_cost/last_unit_cost stop being
 * written by application code as of this release — OpeningBalanceService
 * now blends into Stock.weighted_avg_cost, per Inventory Location,
 * exclusively (see WeightedAverageCostCalculator/ReceiptService), and the
 * Product/Variant catalog is read-only for acquisition cost from here on.
 * Existing ItemVariant rows can still carry stale values from the old
 * divergent write path, so before those fields are frozen this backfills
 * avg_unit_cost to the current on-hand-qty-weighted rollup of
 * Stock.weighted_avg_cost across every location the variant has stock in —
 * the same weighted-average formula the app now applies per-location, just
 * aggregated across locations for this one-time correction.
 *
 * A variant with no on-hand stock anywhere is left untouched — there is
 * nothing to weight an average against, and inventing a value would itself
 * be the kind of unexpected total-changing rounding the acceptance
 * criteria rule out.
 *
 * last_unit_cost is intentionally NOT touched here: there is no reliable
 * single "last" value to derive across multiple locations without an
 * arbitrary tie-break, and the acceptance criteria only ask to reconcile
 * the *weighted-average* cost. It stays exactly as its last write left it.
 *
 * Direction runs both ways, in two passes:
 * 1. Seed pre-existing Stock rows first. Any Stock row with on_hand > 0
 *    but weighted_avg_cost still at its column default (0) predates the
 *    Stock-authoritative cost model — it was created by the pre-#434
 *    OpeningBalanceService, which never wrote to Stock at all (Receipts,
 *    #432, already did). Once StockOutService/reports switch to reading
 *    Stock.weighted_avg_cost, an un-seeded row would cost those movements
 *    at zero, silently losing valuation. The only value available to seed
 *    it with is the variant's current (pre-migration) avg_unit_cost — the
 *    same number every location effectively shared under the old global
 *    write path, so this preserves continuity rather than asserting a new
 *    value.
 * 2. Then roll Stock.weighted_avg_cost — now including both those seeded
 *    rows and any genuinely per-location values from Receipts — back up
 *    into ItemVariant.avg_unit_cost, as before.
 *
 * Rollback: none, by design — same precedent as
 * 2026_08_19_000000_delete_legacy_producto_items_without_inventory_category.php.
 * This is a one-time data correction, not a schema change; un-correcting
 * stale values on rollback would be actively wrong, not neutral.
 */
return new class extends Migration
{
    public function up(): void
    {
        $this->seedZeroCostStockFromLegacyVariantCost();

        $rollups = DB::table('stock')
            ->select('item_variant_id')
            ->selectRaw('SUM(on_hand * weighted_avg_cost) as weighted_value')
            ->selectRaw('SUM(on_hand) as total_on_hand')
            ->where('on_hand', '>', 0)
            ->groupBy('item_variant_id')
            ->get();

        foreach ($rollups as $rollup) {
            // Postgres returns SUM() as a numeric string — bcdiv keeps the
            // division itself exact-decimal instead of round-tripping
            // through float, which is what could reintroduce drift (and
            // lose precision for large SUM() values) here.
            $totalOnHand = (string) $rollup->total_on_hand;

            if (bccomp($totalOnHand, '0', 8) <= 0) {
                continue;
            }

            $reconciledAvg = round((float) bcdiv((string) $rollup->weighted_value, $totalOnHand, 8), 4);

            $variant = DB::table('item_variants')
                ->where('id', $rollup->item_variant_id)
                ->first(['id', 'avg_unit_cost']);

            if (! $variant) {
                continue;
            }

            $currentAvg = (float) $variant->avg_unit_cost;

            if (abs($currentAvg - $reconciledAvg) < 0.00005) {
                continue;
            }

            Log::info('#434 reconciliation: backfilled ItemVariant.avg_unit_cost from Stock.weighted_avg_cost rollup', [
                'item_variant_id' => $variant->id,
                'before' => $currentAvg,
                'after' => $reconciledAvg,
            ]);

            DB::table('item_variants')
                ->where('id', $variant->id)
                ->update(['avg_unit_cost' => $reconciledAvg]);
        }
    }

    /**
     * Seed any Stock row still at the weighted_avg_cost column default (0)
     * with on-hand quantity — pre-#434 opening-balance-only stock that never
     * had a chance to write Stock.weighted_avg_cost — from that variant's
     * legacy avg_unit_cost, so the subsequent rollup (and every read after
     * this deploy) doesn't silently zero out existing inventory valuation.
     */
    private function seedZeroCostStockFromLegacyVariantCost(): void
    {
        $zeroCostStockRows = DB::table('stock')
            ->where('on_hand', '>', 0)
            ->where('weighted_avg_cost', 0)
            ->get(['id', 'item_variant_id']);

        foreach ($zeroCostStockRows as $stockRow) {
            $variant = DB::table('item_variants')
                ->where('id', $stockRow->item_variant_id)
                ->first(['avg_unit_cost']);

            if (! $variant || (float) $variant->avg_unit_cost <= 0) {
                continue;
            }

            Log::info('#434 reconciliation: seeded Stock.weighted_avg_cost from legacy ItemVariant.avg_unit_cost', [
                'stock_id' => $stockRow->id,
                'item_variant_id' => $stockRow->item_variant_id,
                'seeded_cost' => $variant->avg_unit_cost,
            ]);

            DB::table('stock')
                ->where('id', $stockRow->id)
                ->update(['weighted_avg_cost' => $variant->avg_unit_cost]);
        }
    }

    /**
     * Data cleanup — nothing to reverse (see class docblock).
     */
    public function down(): void
    {
        //
    }
};
