<?php

namespace App\Services\Inventory\Concerns;

use App\Exceptions\UomConversionNotFoundException;
use App\Models\ItemVariant;
use App\Models\UnitOfMeasure;
use App\Models\UomConversion;

/**
 * UOM-to-base-UOM conversion logic shared by StockOutService and OpeningBalanceService.
 */
trait ConvertsUomQuantities
{
    /**
     * Get conversion between two UOMs (searches in both directions)
     */
    protected function getConversion(int $fromUomId, int $toUomId): ?UomConversion
    {
        // Try direct conversion first
        $conversion = UomConversion::where('from_uom_id', $fromUomId)
            ->where('to_uom_id', $toUomId)
            ->where('is_active', true)
            ->first();

        if ($conversion) {
            return $conversion;
        }

        // Try inverse conversion
        $inverseConversion = UomConversion::where('from_uom_id', $toUomId)
            ->where('to_uom_id', $fromUomId)
            ->where('is_active', true)
            ->first();

        if ($inverseConversion) {
            // Create a virtual conversion with inverted factor
            $virtual = new UomConversion;
            $virtual->from_uom_id = $fromUomId;
            $virtual->to_uom_id = $toUomId;
            $virtual->factor = 1 / $inverseConversion->factor;
            $virtual->tolerance_percent = $inverseConversion->tolerance_percent;
            $virtual->is_active = true;

            return $virtual;
        }

        return null;
    }

    /**
     * Convert a UOM quantity to base UOM, returning [baseQuantity, conversionFactor].
     *
     * @throws UomConversionNotFoundException
     */
    private function convertToBaseQuantity(float $quantity, int $uomId, ItemVariant $variant, UnitOfMeasure $uom): array
    {
        if ($uomId === $variant->uom_id) {
            return [$quantity, 1.0];
        }

        $conversion = $this->getConversion($uomId, $variant->uom_id);
        if (! $conversion) {
            throw new UomConversionNotFoundException(
                "No conversion found from {$uom->code} to {$variant->unitOfMeasure->code}"
            );
        }

        return [$quantity * $conversion->factor, $conversion->factor];
    }
}
