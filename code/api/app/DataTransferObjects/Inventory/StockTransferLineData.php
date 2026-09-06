<?php

namespace App\DataTransferObjects\Inventory;

/**
 * One requested line of a Stock Transfer (#573). Quantities are as the operator
 * captured them, in `entryUomId`; the Service converts to the Variant base UOM.
 */
final readonly class StockTransferLineData
{
    public function __construct(
        public int $itemVariantId,
        public int $entryUomId,
        public float $entryQuantity,
    ) {}
}
