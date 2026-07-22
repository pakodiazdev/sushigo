<?php

namespace App\DataTransferObjects\Inventory;

final readonly class RegisterStockOutData
{
    public function __construct(
        public int $inventoryLocationId,
        public int $itemVariantId,
        public float $quantity,
        public int $transactionUomId,
        public string $reason,
        public ?float $salePrice = null,
        public ?int $userId = null,
        public ?string $reference = null,
        public ?string $notes = null,
    ) {}
}
