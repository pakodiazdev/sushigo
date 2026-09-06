<?php

declare(strict_types=1);

namespace App\Http\Requests\Inventory\StockTransfer;

use App\DataTransferObjects\Inventory\SaveStockTransferData;
use App\DataTransferObjects\Inventory\StockTransferLineData;
use App\Http\Requests\Inventory\StockTransfer\Concerns\ScopesLocationToAccessibleUnits;
use App\Http\Requests\Inventory\StockTransfer\Concerns\SharesStockTransferValidationMessages;
use App\Models\InventoryLocation;
use App\Models\ItemVariant;
use App\Models\UnitOfMeasure;
use App\Models\UomConversion;
use Illuminate\Contracts\Validation\Validator;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

abstract class StockTransferRequest extends FormRequest
{
    use ScopesLocationToAccessibleUnits;
    use SharesStockTransferValidationMessages;

    public function authorize(): bool
    {
        return true;
    }

    /** @return array<string, array<int, mixed>> */
    protected function transferRules(): array
    {
        return [
            'source_location_id' => ['required', 'string', $this->accessibleLocationRule()],
            'destination_location_id' => ['required', 'string', 'different:source_location_id', $this->accessibleLocationRule()],
            'reference' => ['nullable', 'string', 'max:255'],
            'transfer_date' => ['required', 'date'],
            'notes' => ['nullable', 'string'],
            'lines' => ['required', 'array', 'min:1'],
            'lines.*.item_variant_id' => ['required', 'string', Rule::exists('item_variants', 'public_id')->withoutTrashed()],
            'lines.*.entry_uom_id' => ['required', 'string', Rule::exists('units_of_measure', 'public_id')],
            // `entry_quantity` and the derived `base_quantity` are stored as
            // decimal(15,4) with a `> 0` CHECK — a value below the smallest
            // representable positive step (0.0001) would round to 0.0000 and
            // surface as a 500 from the DB constraint. `min` rejects it as a 422
            // instead; the base-UOM rounding case is covered in withValidator().
            'lines.*.entry_quantity' => ['required', 'numeric', 'min:0.0001'],
        ];
    }

    /** @return array<string, string> */
    public function messages(): array
    {
        return $this->stockTransferMessages(array_keys(self::MESSAGES));
    }

    public function withValidator(Validator $validator): void
    {
        $validator->after(function (Validator $validator): void {
            $lines = (array) $this->input('lines', []);

            $this->rejectDuplicateVariants($validator, $lines);

            foreach ($lines as $index => $line) {
                $this->validateUomConversion($validator, (string) $index, (array) $line);
            }
        });
    }

    /**
     * A Variant may appear at most once per Transfer — the document-line
     * uniqueness rule, checked here so the caller gets a 422 instead of a raw
     * unique-constraint violation at write time.
     *
     * @param  array<int|string, mixed>  $lines
     */
    private function rejectDuplicateVariants(Validator $validator, array $lines): void
    {
        $seen = [];

        foreach ($lines as $index => $line) {
            $variantId = (array) $line;
            $variantId = $variantId['item_variant_id'] ?? null;

            if ($variantId === null || $validator->errors()->has("lines.{$index}.item_variant_id")) {
                continue;
            }

            if (isset($seen[$variantId])) {
                $validator->errors()->add(
                    "lines.{$index}.item_variant_id",
                    'Esta variante ya está incluida en otra línea del traslado.'
                );

                continue;
            }

            $seen[$variantId] = true;
        }
    }

    /**
     * The line's entry UOM must be convertible to the Variant's base UOM —
     * either it *is* the base UOM, or an active `UomConversion` exists in some
     * direction between the two — and the converted base quantity must still be
     * representable and positive at decimal(15,4). A tiny entry quantity in a
     * unit much larger than the base (e.g. 0.0001 t → g) can round to 0.0000 and
     * trip the DB `> 0` CHECK as a 500; reject it here as a 422 instead.
     *
     * @param  array<string, mixed>  $line
     */
    private function validateUomConversion(Validator $validator, string $index, array $line): void
    {
        $variantPublicId = $line['item_variant_id'] ?? null;
        $uomPublicId = $line['entry_uom_id'] ?? null;

        if (
            $variantPublicId === null
            || $uomPublicId === null
            || $validator->errors()->has("lines.{$index}.item_variant_id")
            || $validator->errors()->has("lines.{$index}.entry_uom_id")
            || $validator->errors()->has("lines.{$index}.entry_quantity")
        ) {
            return;
        }

        $variantBaseUomId = ItemVariant::where('public_id', $variantPublicId)->value('uom_id');
        $entryUomId = UnitOfMeasure::where('public_id', $uomPublicId)->value('id');

        if ($variantBaseUomId === null || $entryUomId === null) {
            return;
        }

        $entryQuantity = (float) ($line['entry_quantity'] ?? 0);

        if ((int) $variantBaseUomId === (int) $entryUomId) {
            $this->assertBaseQuantityRepresentable($validator, $index, $entryQuantity);

            return;
        }

        $factor = $this->resolveConversionFactor((int) $entryUomId, (int) $variantBaseUomId);

        if ($factor === null) {
            $validator->errors()->add(
                "lines.{$index}.entry_uom_id",
                'No existe una conversión activa entre la unidad de medida y la unidad base de la variante.'
            );

            return;
        }

        $this->assertBaseQuantityRepresentable($validator, $index, $entryQuantity * $factor);
    }

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

        return ($inverse !== null && (float) $inverse != 0.0) ? 1 / (float) $inverse : null;
    }

    private function assertBaseQuantityRepresentable(Validator $validator, string $index, float $baseQuantity): void
    {
        if (round($baseQuantity, 4) < 0.0001) {
            $validator->errors()->add(
                "lines.{$index}.entry_quantity",
                'La cantidad convertida a la unidad base es demasiado pequeña para registrarse (mínimo 0.0001).'
            );
        }
    }

    public function transferData(): SaveStockTransferData
    {
        $data = $this->validated();

        $sourceId = InventoryLocation::where('public_id', $data['source_location_id'])->value('id');
        $destinationId = InventoryLocation::where('public_id', $data['destination_location_id'])->value('id');

        $lines = array_map(function (array $line): StockTransferLineData {
            return new StockTransferLineData(
                itemVariantId: (int) ItemVariant::where('public_id', $line['item_variant_id'])->value('id'),
                entryUomId: (int) UnitOfMeasure::where('public_id', $line['entry_uom_id'])->value('id'),
                entryQuantity: (float) $line['entry_quantity'],
            );
        }, $data['lines']);

        return new SaveStockTransferData(
            sourceLocationId: (int) $sourceId,
            destinationLocationId: (int) $destinationId,
            reference: $data['reference'] ?? null,
            transferDate: $data['transfer_date'],
            notes: $data['notes'] ?? null,
            actingUserId: $this->user()->id,
            lines: $lines,
        );
    }
}
