<?php

declare(strict_types=1);

namespace App\Http\Resources\Inventory\StockMovement;

use App\Http\Resources\BaseResource;
use App\Models\StockMovement;

/**
 * Full immutable evidence for a single Stock Movement (#574) — the detail read
 * behind GET /inventory/movements/{movement}.
 *
 * Reuses the summary row's shape verbatim and layers on the fields a full audit
 * needs: free-text notes, the reversal audit trail, and the two-way link
 * between an original movement and its compensating reversal (both by public
 * ID, never internal keys). Optional/soft-deleted related records serialize as
 * null without ever hiding the movement row itself.
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
        ];
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
