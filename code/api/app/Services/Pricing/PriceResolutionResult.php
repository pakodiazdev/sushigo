<?php

namespace App\Services\Pricing;

use App\Models\PriceList;
use App\Models\PriceListAssignment;

/**
 * The outcome of PriceResolutionService::resolve() — always a concrete,
 * explicit answer (found or not-found), never an exception or a silent
 * fallback (the former ItemVariant.sale_price column was dropped in #442).
 */
final readonly class PriceResolutionResult
{
    private function __construct(
        public bool $resolved,
        public ?string $price,
        public ?PriceList $priceList,
        public ?PriceListAssignment $assignment,
    ) {}

    public static function found(string $price, PriceList $priceList, PriceListAssignment $assignment): self
    {
        return new self(true, $price, $priceList, $assignment);
    }

    public static function none(): self
    {
        return new self(false, null, null, null);
    }
}
