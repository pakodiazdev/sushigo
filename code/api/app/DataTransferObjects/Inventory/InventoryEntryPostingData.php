<?php

namespace App\DataTransferObjects\Inventory;

use DateTimeInterface;
use InvalidArgumentException;

/**
 * A normalized inbound inventory posting command (#567).
 *
 * Every quantity is already expressed in the Variant's base UOM — document
 * specific conversion stays with the calling workflow. `unitCost` is a base-UOM
 * unit cost: `null` means "no cost supplied, do not blend", while an explicit
 * `0.0` is a real cost that still blends into the weighted average.
 *
 * `sourceType` / `sourceId` / `sourceLineId` are the explicit source-document
 * line identity, and they are **all-or-nothing**: either all three are set (a
 * document line, idempotent on (sourceType, sourceId, sourceLineId, reason) —
 * replaying returns the existing movement instead of incrementing Stock again)
 * or all three are null (a manual movement with no idempotency contract, e.g.
 * an Opening Balance with no source document). A partial triple is rejected:
 * with `sourceType`/`sourceId` null the partial UNIQUE index cannot enforce
 * uniqueness (NULLs don't collide) and the idempotency promise would silently
 * not hold, letting concurrent duplicates both increment Stock.
 */
final readonly class InventoryEntryPostingData
{
    /**
     * @param  array<string, mixed>  $movementMeta
     */
    public function __construct(
        public int $inventoryLocationId,
        public int $itemVariantId,
        public float $baseQuantity,
        public string $reason,
        public ?int $userId = null,
        public ?float $unitCost = null,
        public ?string $reference = null,
        public ?string $notes = null,
        public ?string $sourceType = null,
        public ?int $sourceId = null,
        public ?int $sourceLineId = null,
        public array $movementMeta = [],
        public ?DateTimeInterface $postedAt = null,
        public ?InventoryEntryLineData $line = null,
    ) {
        $sourceFieldsSet = count(array_filter(
            [$this->sourceType, $this->sourceId, $this->sourceLineId],
            static fn ($value) => $value !== null,
        ));

        if ($sourceFieldsSet !== 0 && $sourceFieldsSet !== 3) {
            throw new InvalidArgumentException(
                'Source identity is all-or-nothing: sourceType, sourceId and sourceLineId must be set together '
                .'or all left null. A partial triple cannot be enforced by the source-line uniqueness index.'
            );
        }
    }
}
