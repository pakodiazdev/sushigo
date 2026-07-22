<?php

namespace App\DataTransferObjects\Inventory;

final readonly class RegisterOpeningBalanceData
{
    public function __construct(
        public int $inventoryLocationId,
        public int $itemVariantId,
        public float $quantity,
        public int $entryUomId,
        public ?float $unitCost = null,
        public ?int $userId = null,
        public ?string $reference = null,
        public ?string $notes = null,
    ) {}
}
