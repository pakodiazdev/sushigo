<?php

namespace App\DataTransferObjects\Inventory;

/**
 * Normalized create/update payload for a Stock Transfer draft (#573). All ID
 * fields are already resolved to numeric primary keys by the FormRequest.
 */
final readonly class SaveStockTransferData
{
    /**
     * @param  array<int, StockTransferLineData>  $lines
     */
    public function __construct(
        public int $sourceLocationId,
        public int $destinationLocationId,
        public ?string $reference,
        public string $transferDate,
        public ?string $notes,
        public int $actingUserId,
        public array $lines,
    ) {}
}
