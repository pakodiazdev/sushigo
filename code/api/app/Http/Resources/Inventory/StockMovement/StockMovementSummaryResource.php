<?php

declare(strict_types=1);

namespace App\Http\Resources\Inventory\StockMovement;

use App\Http\Resources\BaseResource;
use App\Models\StockMovement;
use App\Support\Inventory\StockMovementSourceType;

/**
 * Bounded ledger row for the immutable Stock Movement history list (#574).
 *
 * Carries what a browsing operator needs to scan and filter the ledger — the
 * public ID, derived direction, quantity, both touched Locations, the moved
 * Variant, the actor, and the source-document identity — but omits the
 * heavyweight detail-only fields (`notes`, reversal audit trail, cross-linked
 * original/compensating movement). Full evidence is fetched from
 * GET /inventory/movements/{movement}.
 *
 * @mixin StockMovement
 */
class StockMovementSummaryResource extends BaseResource
{
    public function toArray($request): array
    {
        return [
            'id' => $this->public_id,
            'reason' => $this->reason,
            'status' => $this->status,
            'direction' => self::directionFor($this->resource),
            'is_reversal' => $this->reverses_stock_movement_id !== null,
            'quantity' => (float) $this->qty,
            'reference' => $this->reference,
            'from_location' => $this->whenLoaded('fromLocation', fn () => self::locationRef($this->fromLocation)),
            'to_location' => $this->whenLoaded('toLocation', fn () => self::locationRef($this->toLocation)),
            'variant' => $this->whenLoaded('itemVariant', fn () => self::variantRef($this->itemVariant)),
            'actor' => $this->whenLoaded('user', fn () => $this->user ? [
                'id' => $this->user->id,
                'name' => $this->user->name,
            ] : null),
            'source' => self::sourceRef($this->resource),
            'posted_at' => $this->posted_at?->toIso8601String(),
            'created_at' => $this->created_at?->toIso8601String(),
            'updated_at' => $this->updated_at?->toIso8601String(),
        ];
    }

    /**
     * Derived movement kind — never the removed legacy `type` column.
     */
    public static function directionFor(StockMovement $movement): string
    {
        $isAdjustment = in_array(
            $movement->reason,
            [StockMovement::REASON_ADJUSTMENT, StockMovement::REASON_COUNT_VARIANCE],
            true,
        );

        return match (true) {
            $isAdjustment => 'adjustment',
            $movement->from_location_id !== null && $movement->to_location_id !== null => 'transfer',
            $movement->to_location_id !== null => 'entry',
            $movement->from_location_id !== null => 'exit',
            default => 'adjustment',
        };
    }

    /**
     * @return array{id: string, name: string}|null
     */
    public static function locationRef($location): ?array
    {
        return $location ? [
            'id' => $location->public_id,
            'name' => $location->name,
        ] : null;
    }

    /**
     * @return array{id: string, code: string, name: string, base_uom: array{id: string, code: string, name: string, symbol: string|null}|null}|null
     */
    public static function variantRef($variant): ?array
    {
        if (! $variant) {
            return null;
        }

        $uom = $variant->relationLoaded('unitOfMeasure') ? $variant->unitOfMeasure : null;

        return [
            'id' => $variant->public_id,
            'code' => $variant->code,
            'name' => $variant->name,
            'base_uom' => $uom ? [
                'id' => $uom->public_id,
                'code' => $uom->code,
                'name' => $uom->name,
                'symbol' => $uom->symbol,
            ] : null,
        ];
    }

    /**
     * The originating document, identified only by its public ULID — never the
     * internal `related_id` / `related_line_id` keys (#574: "public IDs are used
     * consistently at the HTTP boundary"). `id` is null when the source record
     * was hard-deleted, or when `related` was not eager-loaded.
     *
     * @return array{type: string, id: string|null}|null
     */
    public static function sourceRef(StockMovement $movement): ?array
    {
        $token = StockMovementSourceType::tokenFor($movement->related_type);

        if ($token === null) {
            return null;
        }

        $related = $movement->relationLoaded('related') ? $movement->related : null;

        return [
            'type' => $token,
            'id' => $related?->public_id,
        ];
    }
}
