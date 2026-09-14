<?php

declare(strict_types=1);

namespace App\Http\Resources\Inventory\StockMovement;

use App\Http\Resources\BaseResource;
use App\Models\StockMovement;
use App\Models\StockMovementLine;

/**
 * Full immutable evidence for a single Stock Movement (#574) — the detail read
 * behind GET /inventory/movements/{movement}.
 *
 * Reuses the summary row's shape verbatim and layers on the fields a full audit
 * needs: free-text notes, the reversal audit trail, the two-way link between an
 * original movement and its compensating reversal (both by public ID, never
 * internal keys), and the movement's own valuation evidence (#579) — the exact
 * unit cost and line total this movement recorded, never leaking the
 * `stock_movement_lines` row's own internal ID. Optional/soft-deleted related
 * records serialize as null without ever hiding the movement row itself.
 *
 * @mixin StockMovement
 */
class StockMovementResource extends BaseResource
{
    public function toArray($request): array
    {
        return [
            ...(new StockMovementSummaryResource($this->resource))->toArray($request),
            'notes' => $this->notes,
            'reverses' => $this->whenLoaded('reverses', fn () => self::linkRef($this->reverses)),
            'reversed_by' => $this->whenLoaded('reversal', fn () => self::linkRef($this->reversal)),
            'reversed_at' => $this->reversed_at?->toIso8601String(),
            'reversal_reason' => $this->reversal_reason,
            'valuation' => $this->whenLoaded('lines', fn () => self::valuationRef($this->lines->first())),
        ];
    }

    /**
     * `unit_cost`/`line_total` are nullable on the line itself (e.g.
     * OpeningBalanceService intentionally records both as null when no cost
     * was supplied) — null must survive here, not collapse to `0.0`, which
     * already has a distinct, real meaning: an explicit free/bonus cost.
     *
     * @return array{unit_cost: float|null, line_total: float|null}|null
     */
    private static function valuationRef(?StockMovementLine $line): ?array
    {
        if ($line === null) {
            return null;
        }

        return [
            'unit_cost' => self::toNullableFloat($line->unit_cost),
            'line_total' => self::toNullableFloat($line->line_total),
        ];
    }

    private static function toNullableFloat(mixed $value): ?float
    {
        return $value !== null ? (float) $value : null;
    }

    /**
     * @return array{id: string, reason: string, status: string, posted_at: string|null}|null
     */
    private static function linkRef(?StockMovement $movement): ?array
    {
        return $movement ? [
            'id' => $movement->public_id,
            'reason' => $movement->reason,
            'status' => $movement->status,
            'posted_at' => $movement->posted_at?->toIso8601String(),
        ] : null;
    }
}
