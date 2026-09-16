<?php

namespace App\DataTransferObjects\Inventory;

/**
 * A single Stock Transfer line to preview (#613). All ID fields are already
 * resolved to numeric primary keys by the FormRequest.
 */
final readonly class PreviewStockTransferLineData
{
    public function __construct(
        public int $sourceLocationId,
        public int $itemVariantId,
        public int $entryUomId,
        public float $entryQuantity,
    ) {}
}
