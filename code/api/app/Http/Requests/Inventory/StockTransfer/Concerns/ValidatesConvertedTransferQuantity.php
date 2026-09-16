<?php

declare(strict_types=1);

namespace App\Http\Requests\Inventory\StockTransfer\Concerns;

use App\Models\UomConversion;
use Illuminate\Contracts\Validation\Validator;

/**
 * Shared entry->base UOM-conversion range checks (#613) for every Stock
 * Transfer FormRequest that captures a raw entry quantity — the create/
 * update request's `lines.*` and the preview request's single line. Both
 * must reject exactly the same out-of-range/unrepresentable inputs, since a
 * preview that accepted a quantity the real create/update endpoint would
 * later reject as 422 would misrepresent what can actually be persisted.
 */
trait ValidatesConvertedTransferQuantity
{
    /**
     * The smallest and largest values `decimal(15,4)` (11 integer digits, 4
     * fractional) can hold. `entry_quantity` and the derived `base_quantity`
     * both use that column type with a `> 0` CHECK, so a value outside this
     * band reaches PostgreSQL as an out-of-range numeric / a zero-rounding
     * CHECK violation and surfaces as a 500 rather than a 422.
     */
    private const MIN_STORABLE_QTY = 0.0001;

    private const MAX_STORABLE_QTY = '99999999999.9999';

    /** Smallest positive value retained by the decimal(15,6) factor snapshots. */
    private const MIN_STORABLE_CONVERSION_FACTOR = 0.000001;

    /**
     * The active entry→base factor: a direct `UomConversion.factor`, or the
     * reciprocal of an inverse one. Null when neither direction exists. Mirrors
     * `App\Services\Inventory\Concerns\ConvertsUomQuantities::getConversion()`.
     */
    private function resolveConversionFactor(int $fromUomId, int $toUomId): ?float
    {
        $direct = UomConversion::query()
            ->where('is_active', true)
            ->where('from_uom_id', $fromUomId)
            ->where('to_uom_id', $toUomId)
            ->value('factor');

        if ($direct !== null) {
            return (float) $direct;
        }

        $inverse = UomConversion::query()
            ->where('is_active', true)
            ->where('from_uom_id', $toUomId)
            ->where('to_uom_id', $fromUomId)
            ->value('factor');

        return ($inverse !== null && (float) $inverse != 0.0)
            ? round(1 / (float) $inverse, 6)
            : null;
    }

    /**
     * Assert a resolved entry→base factor exists and is large enough that the
     * converted quantity won't round to zero at the decimal(15,6) snapshot
     * scale. Adds a 422 on `$uomErrorField` and returns null when either check
     * fails, otherwise returns the usable factor.
     */
    private function assertConversionFactorUsable(Validator $validator, string $uomErrorField, ?float $factor): ?float
    {
        if ($factor === null) {
            $validator->errors()->add(
                $uomErrorField,
                'No existe una conversión activa entre la unidad de medida y la unidad base de la variante.'
            );

            return null;
        }

        if ($factor < self::MIN_STORABLE_CONVERSION_FACTOR) {
            $validator->errors()->add(
                $uomErrorField,
                'El factor de conversión es demasiado pequeño para registrarse con la precisión disponible.'
            );

            return null;
        }

        return $factor;
    }

    /**
     * A tiny entry quantity in a unit much larger than the base (e.g. 0.0001 t
     * -> g) can round to 0.0000 and trip the DB `> 0` CHECK as a 500; reject it
     * here as a 422 instead. Adds an error on `$qtyErrorField` when the
     * converted quantity rounds to zero or exceeds the storable range.
     */
    private function assertBaseQuantityRepresentable(Validator $validator, string $qtyErrorField, float $baseQuantity): void
    {
        $rounded = round($baseQuantity, 4);

        if ($rounded < self::MIN_STORABLE_QTY) {
            $validator->errors()->add(
                $qtyErrorField,
                'La cantidad convertida a la unidad base es demasiado pequeña para registrarse (mínimo 0.0001).'
            );

            return;
        }

        if ($rounded > self::MAX_STORABLE_QTY) {
            $validator->errors()->add(
                $qtyErrorField,
                'La cantidad convertida a la unidad base excede el máximo que puede registrarse.'
            );
        }
    }
}
