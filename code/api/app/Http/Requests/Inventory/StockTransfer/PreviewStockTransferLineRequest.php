<?php

declare(strict_types=1);

namespace App\Http\Requests\Inventory\StockTransfer;

use App\DataTransferObjects\Inventory\PreviewStockTransferLineData;
use App\Http\Requests\Inventory\StockTransfer\Concerns\ScopesLocationToAccessibleUnits;
use App\Models\InventoryLocation;
use App\Models\ItemVariant;
use App\Models\UnitOfMeasure;
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
            'entry_quantity' => ['required', 'numeric', 'min:0.0001'],
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
        ];
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
