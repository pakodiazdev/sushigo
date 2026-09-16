<?php

declare(strict_types=1);

namespace App\Http\Requests\Inventory\StockTransfer;

use App\DataTransferObjects\Inventory\PreviewStockTransferLineData;
use App\Http\Requests\Inventory\StockTransfer\Concerns\ScopesLocationToAccessibleUnits;
use App\Http\Requests\Inventory\StockTransfer\Concerns\ValidatesConvertedTransferQuantity;
use App\Models\InventoryLocation;
use App\Models\ItemVariant;
use App\Models\UnitOfMeasure;
use Illuminate\Contracts\Validation\Validator;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/**
 * @OA\Schema(
 *   schema="PreviewStockTransferLineRequest",
 *   required={"source_location_id", "item_variant_id", "entry_uom_id", "entry_quantity"},
 *
 *   @OA\Property(property="source_location_id", type="string", example="01JKXYZ1234567890ABCDEFGH", description="Source Inventory Location public_id (ULID)"),
 *   @OA\Property(property="item_variant_id", type="string", example="01JKXYZ1234567890ABCDEFGH"),
 *   @OA\Property(property="entry_uom_id", type="string", example="01JKXYZ1234567890ABCDEFGH"),
 *   @OA\Property(property="entry_quantity", type="number", format="float", minimum=0.0001, example=12)
 * )
 */
class PreviewStockTransferLineRequest extends FormRequest
{
    use ScopesLocationToAccessibleUnits;
    use ValidatesConvertedTransferQuantity;

    public function authorize(): bool
    {
        // Same shape as StockTransferRequest itself: the functional permission
        // is enforced by the route's `permission:stock.manage` middleware, and
        // the accessible-location rule below scopes `source_location_id` to
        // the caller's own Operating Units (bypass roles excepted).
        return true;
    }

    /** @return array<string, array<int, mixed>> */
    public function rules(): array
    {
        return [
            'source_location_id' => ['required', 'string', $this->accessibleLocationRule(activeOnly: true)],
            'item_variant_id' => ['required', 'string', Rule::exists('item_variants', 'public_id')->withoutTrashed()->where('is_active', true)],
            'entry_uom_id' => ['required', 'string', Rule::exists('units_of_measure', 'public_id')->where('is_active', true)],
            // Same decimal(15,4) band StockTransferRequest enforces on
            // `lines.*.entry_quantity` (#613): a preview that accepted a
            // quantity the create/update request would later reject as 422
            // would misrepresent what can actually be persisted.
            'entry_quantity' => ['required', 'numeric', 'min:'.self::MIN_STORABLE_QTY, 'max:'.self::MAX_STORABLE_QTY],
        ];
    }

    /** @return array<string, string> */
    public function messages(): array
    {
        return [
            'source_location_id.required' => 'La ubicación de origen es requerida.',
            'source_location_id.exists' => 'La ubicación de origen seleccionada no existe.',
            'item_variant_id.required' => 'La variante es requerida.',
            'item_variant_id.exists' => 'La variante seleccionada no existe.',
            'entry_uom_id.required' => 'La unidad de medida es requerida.',
            'entry_uom_id.exists' => 'La unidad de medida seleccionada no existe.',
            'entry_quantity.required' => 'La cantidad es requerida.',
            'entry_quantity.min' => 'La cantidad debe ser al menos 0.0001.',
            'entry_quantity.max' => 'La cantidad excede el máximo permitido.',
        ];
    }

    /**
     * Mirrors `StockTransferRequest::validateUomConversion()` for this single
     * flat line (#613): the entry UOM must convert to the Variant's base UOM,
     * and the converted base quantity must still be representable at
     * decimal(15,4) — the exact same checks the create/update request runs
     * per line, so a preview never accepts a quantity the real endpoint would
     * reject.
     */
    public function withValidator(Validator $validator): void
    {
        $validator->after(function (Validator $validator): void {
            if (
                $validator->errors()->has('item_variant_id')
                || $validator->errors()->has('entry_uom_id')
                || $validator->errors()->has('entry_quantity')
            ) {
                return;
            }

            $variantBaseUomId = ItemVariant::where('public_id', $this->input('item_variant_id'))->value('uom_id');
            $entryUomId = UnitOfMeasure::where('public_id', $this->input('entry_uom_id'))->value('id');

            if ($variantBaseUomId === null || $entryUomId === null) {
                return;
            }

            $entryQuantity = (float) $this->input('entry_quantity', 0);

            if ((int) $variantBaseUomId === (int) $entryUomId) {
                $this->assertBaseQuantityRepresentable($validator, 'entry_quantity', $entryQuantity);

                return;
            }

            $factor = $this->assertConversionFactorUsable(
                $validator,
                'entry_uom_id',
                $this->resolveConversionFactor((int) $entryUomId, (int) $variantBaseUomId),
            );

            if ($factor === null) {
                return;
            }

            $this->assertBaseQuantityRepresentable($validator, 'entry_quantity', $entryQuantity * $factor);
        });
    }

    public function previewData(): PreviewStockTransferLineData
    {
        $data = $this->validated();

        return new PreviewStockTransferLineData(
            sourceLocationId: (int) InventoryLocation::where('public_id', $data['source_location_id'])->value('id'),
            itemVariantId: (int) ItemVariant::where('public_id', $data['item_variant_id'])->value('id'),
            entryUomId: (int) UnitOfMeasure::where('public_id', $data['entry_uom_id'])->value('id'),
            entryQuantity: (float) $data['entry_quantity'],
        );
    }
}
