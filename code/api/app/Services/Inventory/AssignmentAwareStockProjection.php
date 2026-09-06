<?php

declare(strict_types=1);

namespace App\Services\Inventory;

use App\Models\VariantLocationAssignment;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Collection;

/**
 * Projects the Existencias read model (#571) from the managed
 * Variant-to-Location assignment (#569) as its spine, left-joining the optional
 * physical `stock` row and the optional per-Location replenishment policy
 * (#439).
 *
 * An assigned pair with no `stock` row is a real result: its balance / cost /
 * value fields project as zero and `stock_id` is `null`. No zero `stock` row is
 * ever written — every method here is read-only. #569's backfill guarantees
 * every pre-existing `stock` pair already carries a live assignment, so an
 * assignment-spined query is a superset of the former stock-spined one, never a
 * subset.
 *
 * Both the paginated list (`GET /stock`) and the two summary endpoints
 * (`/stock/by-location/{id}`, `/stock/by-variant/{id}`) build on
 * {@see self::baseQuery()} and format rows through the helpers below, so the
 * assignment/stock/policy join and the zero-projection rule live in one place.
 */
class AssignmentAwareStockProjection
{
    /**
     * A `VariantLocationAssignment` query (live rows only — the model's
     * SoftDeletes scope excludes unassigned pairs) left-joined to its optional
     * `stock` row and optional live replenishment policy, with the joined
     * columns aliased so {@see self::projectRow()} can read them without a
     * second query. Eager-loads the relations the response shapes render.
     *
     * @return Builder<VariantLocationAssignment>
     */
    public function baseQuery(): Builder
    {
        return VariantLocationAssignment::query()
            ->leftJoin('stock', function ($join) {
                $join->on('stock.inventory_location_id', '=', 'variant_location_assignments.inventory_location_id')
                    ->on('stock.item_variant_id', '=', 'variant_location_assignments.item_variant_id');
            })
            ->leftJoin('variant_location_replenishment_policies as vlrp', function ($join) {
                $join->on('vlrp.inventory_location_id', '=', 'variant_location_assignments.inventory_location_id')
                    ->on('vlrp.item_variant_id', '=', 'variant_location_assignments.item_variant_id')
                    ->whereNull('vlrp.deleted_at');
            })
            ->select([
                'variant_location_assignments.*',
                'stock.public_id as stock_public_id',
                'stock.on_hand as stock_on_hand',
                'stock.reserved as stock_reserved',
                'stock.weighted_avg_cost as stock_weighted_avg_cost',
                'vlrp.min_stock as policy_min_stock',
                'vlrp.max_stock as policy_max_stock',
            ])
            ->with([
                'inventoryLocation.operatingUnit',
                'itemVariant.item',
            ]);
    }

    /**
     * Constrain the base query's `min_on_hand` filter against the *projected*
     * on-hand (zero when there is no `stock` row), so `min_on_hand=0` keeps
     * projected zero rows and any positive threshold drops them.
     *
     * @param  Builder<VariantLocationAssignment>  $query
     */
    public function filterMinOnHand(Builder $query, float $minOnHand): void
    {
        $query->whereRaw('coalesce(stock.on_hand, 0) >= ?', [$minOnHand]);
    }

    /**
     * Constrain the base query to rows that are low against their resolved
     * per-Location policy (#439): a live policy must exist and the projected
     * on-hand must sit at or below its `min_stock`. A projected zero row is
     * included when `0 <= min_stock` — i.e. whenever a live policy exists with
     * a non-negative reorder point.
     *
     * @param  Builder<VariantLocationAssignment>  $query
     */
    public function filterLowStock(Builder $query): void
    {
        $query->whereRaw('vlrp.min_stock is not null and coalesce(stock.on_hand, 0) <= vlrp.min_stock');
    }

    /**
     * The canonical projected row for the paginated list. `id` is the
     * assignment's public_id so a row keeps a stable identity whether or not a
     * `stock` row backs it; `stock_id` exposes the nullable physical identity
     * separately.
     *
     * @return array<string, mixed>
     */
    public function projectRow(VariantLocationAssignment $row): array
    {
        return [
            'id' => $row->public_id,
            'assignment_id' => $row->public_id,
            'inventory_location_id' => $row->inventoryLocation->public_id,
            'item_variant_id' => $row->itemVariant->public_id,
            ...$this->moneyFields($row),
            'inventory_location' => $row->inventoryLocation->toArray(),
            'item_variant' => $row->itemVariant->toArray(),
        ];
    }

    /**
     * Balance / cost / value / policy fields, with every numeric field zeroed
     * when no `stock` row backs the assignment and `stock_id` null.
     *
     * @return array<string, mixed>
     */
    public function moneyFields(VariantLocationAssignment $row): array
    {
        $onHand = (float) ($row->stock_on_hand ?? 0);
        $reserved = (float) ($row->stock_reserved ?? 0);
        $weightedAvgCost = (float) ($row->stock_weighted_avg_cost ?? 0);
        $minStock = $row->policy_min_stock !== null ? (float) $row->policy_min_stock : null;

        return [
            'stock_id' => $row->stock_public_id,
            'on_hand' => $onHand,
            'reserved' => $reserved,
            'available' => $onHand - $reserved,
            'weighted_avg_cost' => $weightedAvgCost,
            'total_value' => $onHand * $weightedAvgCost,
            'min_stock' => $minStock,
            'max_stock' => $row->policy_max_stock !== null ? (float) $row->policy_max_stock : null,
            'is_low_stock' => $minStock !== null && $onHand <= $minStock,
        ];
    }

    /**
     * Flattened Variant identity fields for the by-location summary items.
     *
     * @return array<string, mixed>
     */
    public function variantFields(VariantLocationAssignment $row): array
    {
        $variant = $row->itemVariant;

        return [
            'item_variant_id' => $variant->public_id,
            'item_variant_code' => $variant->code,
            'item_variant_name' => $variant->name,
            'item_name' => $variant->item->name,
            'item_sku' => $variant->item->sku,
        ];
    }

    /**
     * Aggregate totals over an assignment-aware row set. `total_variants`
     * counts assigned pairs, not only materialized `stock` rows; monetary
     * totals are unaffected by projected zero rows (they contribute 0).
     * `avg_weighted_cost` is averaged over materialized rows only, so a never
     * received assignment does not drag a Location's valuation toward zero.
     *
     * @param  Collection<int, VariantLocationAssignment>  $rows
     * @return array<string, mixed>
     */
    public function summarize(Collection $rows): array
    {
        $onHand = $rows->sum(fn (VariantLocationAssignment $r) => (float) ($r->stock_on_hand ?? 0));
        $reserved = $rows->sum(fn (VariantLocationAssignment $r) => (float) ($r->stock_reserved ?? 0));
        $materialized = $rows->filter(fn (VariantLocationAssignment $r) => $r->stock_public_id !== null);

        return [
            'assigned_count' => $rows->count(),
            'total_on_hand' => (float) $onHand,
            'total_reserved' => (float) $reserved,
            'total_available' => (float) ($onHand - $reserved),
            'total_inventory_value' => (float) $rows->sum(
                fn (VariantLocationAssignment $r) => (float) ($r->stock_on_hand ?? 0) * (float) ($r->stock_weighted_avg_cost ?? 0)
            ),
            'low_stock_count' => $rows->filter(function (VariantLocationAssignment $r) {
                $min = $r->policy_min_stock;

                return $min !== null && (float) ($r->stock_on_hand ?? 0) <= (float) $min;
            })->count(),
            'avg_weighted_cost' => $materialized->isEmpty()
                ? 0.0
                : (float) $materialized->avg(fn (VariantLocationAssignment $r) => (float) $r->stock_weighted_avg_cost),
        ];
    }
}
