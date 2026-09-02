<?php

namespace App\DataTransferObjects\Inventory;

/**
 * The optional single StockMovementLine an inbound entry appends alongside its
 * StockMovement header (#438 single-line contract). The parent movement id and
 * the item variant are taken from the header, never from here.
 */
final readonly class InventoryEntryLineData
{
    /**
     * @param  array<string, mixed>  $meta
     */
    public function __construct(
        public int $uomId,
        public float $qty,
        public float $baseQty,
        public float $conversionFactor,
        public ?float $unitCost = null,
        public ?float $lineTotal = null,
        public array $meta = [],
    ) {}
}
