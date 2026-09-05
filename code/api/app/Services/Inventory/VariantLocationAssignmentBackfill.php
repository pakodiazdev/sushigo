<?php

declare(strict_types=1);

namespace App\Services\Inventory;

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

/**
 * Seeds `variant_location_assignments` from the assortment intent that is
 * already implied by live inventory data (#569).
 *
 * Before this table existed, "this Variant is managed at this Location" was
 * only ever expressed indirectly:
 *
 *  1. a `stock` row for the pair — the Variant has been received there at
 *     least once, so it is clearly managed there; and
 *  2. a live `variant_location_replenishment_policy` for the pair — someone
 *     configured a reorder point / ceiling for it there, which only makes
 *     sense for a managed Variant.
 *
 * The backfill is the distinct union of those two pair sets. It never writes
 * a `stock` row or a movement (Acceptance Criteria) and it is idempotent — a
 * pair that already has *any* assignment row, live or soft-deleted, is skipped,
 * so a rerun neither duplicates a live assignment nor resurrects one a user
 * deliberately unassigned. Safe to run from the create-table migration and safe
 * to re-run. Reversal is the migration's `down()` dropping the whole table.
 *
 * Written against `DB::table` (not Eloquent) so it runs correctly from inside
 * a migration regardless of the model layer's current state.
 */
class VariantLocationAssignmentBackfill
{
    /**
     * @return array{inserted: int, skipped: int, from_stock: int, from_policies: int}
     */
    public function run(): array
    {
        $stockPairs = DB::table('stock')
            ->select('inventory_location_id', 'item_variant_id')
            ->distinct()
            ->get();

        $policyPairs = DB::table('variant_location_replenishment_policies')
            ->whereNull('deleted_at')
            ->select('inventory_location_id', 'item_variant_id')
            ->distinct()
            ->get();

        $pairs = $stockPairs->concat($policyPairs)
            ->unique(fn (object $row) => $row->inventory_location_id.':'.$row->item_variant_id)
            ->values();

        // Any assignment row for a pair — live *or* soft-deleted — is a decision
        // already on record. Skipping soft-deleted ones too means a rerun never
        // resurrects a pair a user deliberately unassigned (its stock row can
        // still exist, zeroed, after that unassignment). The first run sees an
        // empty table, so this only matters on a rerun.
        $decided = DB::table('variant_location_assignments')
            ->select('inventory_location_id', 'item_variant_id')
            ->get()
            ->map(fn (object $row) => $row->inventory_location_id.':'.$row->item_variant_id)
            ->flip();

        $now = now();
        $rows = [];
        $skipped = 0;

        foreach ($pairs as $pair) {
            if ($decided->has($pair->inventory_location_id.':'.$pair->item_variant_id)) {
                $skipped++;

                continue;
            }

            $rows[] = [
                'public_id' => (string) Str::ulid(),
                'inventory_location_id' => $pair->inventory_location_id,
                'item_variant_id' => $pair->item_variant_id,
                'created_at' => $now,
                'updated_at' => $now,
            ];
        }

        foreach (array_chunk($rows, 500) as $chunk) {
            DB::table('variant_location_assignments')->insert($chunk);
        }

        $summary = [
            'inserted' => count($rows),
            'skipped' => $skipped,
            'from_stock' => $stockPairs->count(),
            'from_policies' => $policyPairs->count(),
        ];

        Log::info('#569 variant-location assignment backfill summary', $summary);

        return $summary;
    }
}
