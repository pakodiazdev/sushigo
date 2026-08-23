<?php

namespace App\Http\Requests\Inventory;

use App\Http\Requests\Concerns\ResolvesStockReferenceIds;
use Illuminate\Foundation\Http\FormRequest;

/**
 * @OA\Schema(
 *   schema="RegisterOpeningBalanceRequest",
 *   required={"inventory_location_id", "item_variant_id", "quantity", "uom_id"},
 *
 *   @OA\Property(property="inventory_location_id", type="string", example="01J...", description="Inventory location public ID"),
 *   @OA\Property(property="item_variant_id", type="string", example="01J...", description="Item variant public ID"),
 *   @OA\Property(property="quantity", type="number", format="float", example=100.5, description="Quantity in entry UOM"),
 *   @OA\Property(property="uom_id", type="string", example="01J...", description="Entry unit of measure public ID"),
 *   @OA\Property(property="unit_cost", type="number", format="float", example=25.50, description="Cost per unit in entry UOM (optional)"),
 *   @OA\Property(property="reference", type="string", maxLength=255, example="INV-2024-001", description="External reference (optional)"),
 *   @OA\Property(property="notes", type="string", example="Initial inventory count", description="Additional notes (optional)"),
 * )
 */
class RegisterOpeningBalanceRequest extends FormRequest
{
    use ResolvesStockReferenceIds;

    public function authorize(): bool
    {
        return $this->user()->can('stock.manage');
    }

    public function rules(): array
    {
        return [
            'inventory_location_id' => ['required', 'string', 'exists:inventory_locations,public_id'],
            'item_variant_id' => ['required', 'string', 'exists:item_variants,public_id'],
            'quantity' => ['required', 'numeric', 'gt:0'],
            'uom_id' => ['required', 'string', 'exists:units_of_measure,public_id'],
            'unit_cost' => ['nullable', 'numeric', 'min:0'],
            'reference' => ['nullable', 'string', 'max:255'],
            'notes' => ['nullable', 'string'],
        ];
    }

    public function messages(): array
    {
        return [
            'quantity.gt' => 'Quantity must be greater than 0',
            'unit_cost.min' => 'Unit cost cannot be negative',
        ];
    }
}
