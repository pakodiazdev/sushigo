<?php

use App\Services\Inventory\LegacyThresholdMigrator;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * #439 — completes the move of replenishment thresholds off the global
 * ItemVariant.
 *
 * 1. LegacyThresholdMigrator copies each legacy min_stock/max_stock pair onto a
 *    per-location policy row, but only where the variant has stock at exactly
 *    one location (unambiguous target). Everything it can't place is logged,
 *    with a summary — see that class.
 * 2. The now-superseded columns are dropped from item_variants.
 *
 * down() re-adds the columns and best-effort copies values back from the
 * policies so a rollback isn't silently lossy; it does not delete policy rows.
 */
return new class extends Migration
{
    public function up(): void
    {
        (new LegacyThresholdMigrator)->migrate();

        Schema::table('item_variants', function (Blueprint $table) {
            $table->dropColumn(['min_stock', 'max_stock']);
        });
    }

    public function down(): void
    {
        Schema::table('item_variants', function (Blueprint $table) {
            $table->decimal('min_stock', 15, 4)->default(0)->after('sale_price')->comment('Minimum stock alert level');
            $table->decimal('max_stock', 15, 4)->default(0)->after('min_stock')->comment('Maximum stock alert level');
        });

        // Best-effort restore: one value per variant, last policy wins. Rollback
        // of a superseded design is inherently approximate — this just avoids
        // leaving every variant at 0.
        $rollups = DB::table('variant_location_replenishment_policies')
            ->whereNull('deleted_at')
            ->select('item_variant_id')
            ->selectRaw('MAX(min_stock) as min_stock')
            ->selectRaw('MAX(max_stock) as max_stock')
            ->groupBy('item_variant_id')
            ->get();

        foreach ($rollups as $rollup) {
            DB::table('item_variants')
                ->where('id', $rollup->item_variant_id)
                ->update(['min_stock' => $rollup->min_stock, 'max_stock' => $rollup->max_stock]);
        }
    }
};
