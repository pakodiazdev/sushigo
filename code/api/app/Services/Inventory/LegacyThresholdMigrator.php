<?php

declare(strict_types=1);

namespace App\Services\Inventory;

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

/**
 * One-time move of the legacy global `item_variants.min_stock` / `max_stock`
 * values onto per-(Inventory Location, Variant) replenishment policy rows
 * (#439).
 *
 * A legacy pair is migrated **only** when the target location is unambiguous —
 * the variant has `stock` at exactly one location. Zero or multiple stock
 * locations means there is no way to place the threshold "without inventing a
 * location assignment" (Acceptance Criterion), so the row is left unmigrated
 * and reported instead.
 *
 * The old schema had no `max_stock >= min_stock` guard, so a legacy row can
 * carry a reorder point with the ceiling left at its `0` default (or, rarely,
 * an inverted pair). The new table's check constraint forbids that, so on
 * migration the ceiling is clamped up to the reorder point — the minimal value
 * that keeps the operationally meaningful `min_stock` intact without inventing a
 * larger ceiling. Every clamp is flagged on the migrated record and counted in
 * the summary.
 *
 * Written against `DB::table` (not Eloquent) so it runs correctly from inside
 * the migration regardless of the ItemVariant model's current fillable/casts
 * or whether the columns have been dropped yet.
 */
class LegacyThresholdMigrator
{
    public const REASON_NO_STOCK_LOCATION = 'no_stock_location';

    public const REASON_MULTIPLE_STOCK_LOCATIONS = 'multiple_stock_locations';

    public const REASON_ALREADY_MIGRATED = 'already_migrated';

    /**
     * @return array{migrated: list<array<string, mixed>>, unresolved: list<array<string, mixed>>}
     */
    public function migrate(): array
    {
        if (! $this->legacyColumnsStillExist()) {
            return ['migrated' => [], 'unresolved' => []];
        }

        $migrated = [];
        $unresolved = [];

        $legacyVariants = DB::table('item_variants')
            ->whereNull('deleted_at')
            ->where(function ($q) {
                $q->where('min_stock', '>', 0)->orWhere('max_stock', '>', 0);
            })
            ->get(['id', 'code', 'min_stock', 'max_stock']);

        foreach ($legacyVariants as $variant) {
            $locationIds = DB::table('stock')
                ->where('item_variant_id', $variant->id)
                ->distinct()
                ->pluck('inventory_location_id');

            $record = [
                'item_variant_id' => $variant->id,
                'item_variant_code' => $variant->code,
                'min_stock' => (float) $variant->min_stock,
                'max_stock' => (float) $variant->max_stock,
            ];

            if ($locationIds->count() === 0) {
                $unresolved[] = [...$record, 'reason' => self::REASON_NO_STOCK_LOCATION, 'location_count' => 0];

                continue;
            }

            if ($locationIds->count() > 1) {
                $unresolved[] = [...$record, 'reason' => self::REASON_MULTIPLE_STOCK_LOCATIONS, 'location_count' => $locationIds->count()];

                continue;
            }

            $locationId = (int) $locationIds->first();

            $alreadyExists = DB::table('variant_location_replenishment_policies')
                ->where('inventory_location_id', $locationId)
                ->where('item_variant_id', $variant->id)
                ->whereNull('deleted_at')
                ->exists();

            if ($alreadyExists) {
                $unresolved[] = [...$record, 'reason' => self::REASON_ALREADY_MIGRATED, 'inventory_location_id' => $locationId];

                continue;
            }

            // The new table enforces max_stock >= min_stock; legacy data does
            // not. Clamp the ceiling up to the reorder point rather than abort
            // (or invent a bigger number).
            $minStock = (float) $variant->min_stock;
            $effectiveMax = max($minStock, (float) $variant->max_stock);
            $clamped = $effectiveMax !== (float) $variant->max_stock;

            $now = now();
            DB::table('variant_location_replenishment_policies')->insert([
                'public_id' => (string) Str::ulid(),
                'inventory_location_id' => $locationId,
                'item_variant_id' => $variant->id,
                'min_stock' => $minStock,
                'max_stock' => $effectiveMax,
                'notes' => null,
                'meta' => json_encode([
                    'migrated_from' => 'item_variants.min_stock/max_stock',
                    'issue' => 439,
                    'max_stock_clamped' => $clamped,
                ]),
                'created_at' => $now,
                'updated_at' => $now,
            ]);

            $migrated[] = [...$record, 'inventory_location_id' => $locationId, 'effective_max_stock' => $effectiveMax, 'max_stock_clamped' => $clamped];
        }

        $this->report($migrated, $unresolved);

        return ['migrated' => $migrated, 'unresolved' => $unresolved];
    }

    private function legacyColumnsStillExist(): bool
    {
        return Schema::hasColumn('item_variants', 'min_stock')
            && Schema::hasColumn('item_variants', 'max_stock');
    }

    /**
     * @param  list<array<string, mixed>>  $migrated
     * @param  list<array<string, mixed>>  $unresolved
     */
    private function report(array $migrated, array $unresolved): void
    {
        foreach ($unresolved as $row) {
            Log::warning('#439 replenishment migration: legacy threshold left unmigrated', $row);
        }

        foreach ($migrated as $row) {
            if ($row['max_stock_clamped'] ?? false) {
                Log::info('#439 replenishment migration: ceiling clamped up to the reorder point', $row);
            }
        }

        Log::info('#439 replenishment migration summary', [
            'migrated_count' => count($migrated),
            'clamped_count' => collect($migrated)->where('max_stock_clamped', true)->count(),
            'unresolved_count' => count($unresolved),
            'unresolved_by_reason' => collect($unresolved)->countBy('reason')->all(),
        ]);
    }
}
