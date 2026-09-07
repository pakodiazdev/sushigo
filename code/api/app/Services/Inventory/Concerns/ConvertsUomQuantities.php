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
    protected function getConversion(int $fromUomId, int $toUomId, bool $lockForUpdate = false): ?UomConversion
    {
        // Try direct conversion first
        $directQuery = UomConversion::where('from_uom_id', $fromUomId)
            ->where('to_uom_id', $toUomId)
            ->where('is_active', true);
        if ($lockForUpdate) {
            $directQuery->lockForUpdate();
        }
        $conversion = $directQuery->first();

        if ($conversion) {
            return $conversion;
        }

        // Try inverse conversion
        $inverseQuery = UomConversion::where('from_uom_id', $toUomId)
            ->where('to_uom_id', $fromUomId)
            ->where('is_active', true);
        if ($lockForUpdate) {
            $inverseQuery->lockForUpdate();
        }
        $inverseConversion = $inverseQuery->first();

        if ($inverseConversion) {
            // Create a virtual conversion with inverted factor
            $virtual = new UomConversion;
            $virtual->from_uom_id = $fromUomId;
            $virtual->to_uom_id = $toUomId;
            // Match the decimal(15,6) factor snapshot before calculating the
            // quantity. Otherwise validation can use an unrounded reciprocal
            // while this model cast silently rounds it to a different value.
            $virtual->factor = round(1 / (float) $inverseConversion->factor, 6);
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
    private function convertToBaseQuantity(
        float $quantity,
        int $uomId,
        ItemVariant $variant,
        UnitOfMeasure $uom,
        bool $lockConversion = false,
    ): array {
        if ($uomId === $variant->uom_id) {
            return [$quantity, 1.0];
        }

        $conversion = $this->getConversion($uomId, $variant->uom_id, $lockConversion);
        if (! $conversion) {
            throw new UomConversionNotFoundException(
                "No conversion found from {$uom->code} to {$variant->unitOfMeasure->code}"
            );
        }

        return [$quantity * $conversion->factor, $conversion->factor];
    }
}
