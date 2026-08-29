<?php

namespace App\Http\Requests\Items;

use App\Models\Item;
use App\Models\ItemVariant;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/**
 * @OA\Schema(
 *   schema="CreateItemVariantRequest",
 *   required={"item_id", "uom_id", "code", "name"},
 *
 *   @OA\Property(property="item_id", type="integer", example=1, description="Parent item ID"),
 *   @OA\Property(property="uom_id", type="integer", example=1, description="Base unit of measure ID"),
 *   @OA\Property(property="code", type="string", maxLength=100, example="ARR-KG", description="Unique variant code"),
 *   @OA\Property(property="barcode", type="string", maxLength=50, example="7501234567890", description="Product barcode (EAN, UPC, Code128, etc.) - optional"),
 *   @OA\Property(property="name", type="string", maxLength=255, example="Arroz Premium 1kg", description="Variant name"),
 *   @OA\Property(property="description", type="string", example="Presentación de 1 kilogramo", description="Variant description"),
 *   @OA\Property(property="track_lot", type="boolean", example=false, description="Track lot numbers (default: false)"),
 *   @OA\Property(property="track_serial", type="boolean", example=false, description="Track serial numbers (default: false)"),
 *   @OA\Property(property="is_active", type="boolean", example=true, description="Active status (default: true)"),
 * )
 */
class CreateItemVariantRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->can('create', ItemVariant::class);
    }

    public function rules(): array
    {
        return [
            // Rejects a PRODUCTO-type item_id too, not just a nonexistent one — Product variants
            // must go through POST /inventory/products/{id}/variants (#425) instead; this legacy
            // path was closed by #429. Per-Variant sale_price / acquisition cost were dropped in
            // #442 (price lists #435, Stock.weighted_avg_cost #434); replenishment thresholds
            // moved to the per-Inventory-Location policy in #439.
            'item_id' => [
                'required',
                'integer',
                Rule::exists('items', 'id')->where(fn ($query) => $query->whereNot('type', Item::TYPE_PRODUCTO)),
            ],
            'uom_id' => ['required', 'integer', 'exists:units_of_measure,id'],
            'code' => ['required', 'string', 'max:100', 'unique:item_variants,code'],
            'barcode' => ['nullable', 'string', 'max:50', 'unique:item_variants,barcode'],
            'name' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'track_lot' => ['nullable', 'boolean'],
            'track_serial' => ['nullable', 'boolean'],
            'is_active' => ['nullable', 'boolean'],
        ];
    }

    public function prepareForValidation(): void
    {
        $data = [
            'code' => strtoupper($this->code ?? ''),
        ];

        // Clean barcode: remove spaces and special characters
        if ($this->filled('barcode')) {
            $data['barcode'] = preg_replace('/[^0-9A-Z]/', '', strtoupper($this->barcode));
        }

        $this->merge($data);
    }
}
