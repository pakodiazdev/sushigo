<?php

namespace App\DataTransferObjects\Inventory;

final readonly class ReceiptLineData
{
    public function __construct(
        public int $variantPurchasePresentationId,
        public ?int $supplierOfferingId,
        public float $orderedPackages,
        public float $receivedPackages,
        public float $bonusPackages,
        public float $grossAmount,
        public float $discounts,
        public float $allocatedExpenses,
        public float $nonRecoverableTaxes,
    ) {}
}
