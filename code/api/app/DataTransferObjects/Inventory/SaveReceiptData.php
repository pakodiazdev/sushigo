<?php

namespace App\DataTransferObjects\Inventory;

final readonly class SaveReceiptData
{
    /**
     * @param  array<int, ReceiptLineData>  $lines
     */
    public function __construct(
        public int $supplierId,
        public int $destinationLocationId,
        public ?string $reference,
        public string $receiptDate,
        public ?string $notes,
        public int $actingUserId,
        public array $lines,
    ) {}
}
