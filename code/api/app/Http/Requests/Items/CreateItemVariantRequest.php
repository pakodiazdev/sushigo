<?php

namespace App\Http\Requests\Items;

use App\Http\Requests\Concerns\ResolvesPublicIdReferences;
use App\Models\Item;
use App\Models\ItemVariant;
use App\Models\UnitOfMeasure;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/**
 * @OA\Schema(
 *   schema="CreateItemVariantRequest",
 *   required={"item_id", "uom_id", "code", "name"},
 *
 *   @OA\Property(property="item_id", type="string", example="01K4M6QY8E2B7N9Z3T5V1W0XCD", description="Parent item public ID"),
 *   @OA\Property(property="uom_id", type="string", example="01K4M6QY8E2B7N9Z3T5V1W0XCE", description="Base unit of measure public ID"),
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
    public const DUPLICATE_CODE_MESSAGE = 'El SKU ya está en uso. Revisa la nueva sugerencia y vuelve a enviar el formulario.';

    use ResolvesPublicIdReferences;

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
            // See the Product-scoped request: the database constraint owns SKU collision
            // detection so the create response can always return the next suggestion.
            'code' => ['required', 'string', 'max:100'],
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
            'item_id' => $this->normalizePublicIdReference(Item::class, $this->input('item_id')),
            'uom_id' => $this->normalizePublicIdReference(UnitOfMeasure::class, $this->input('uom_id')),
        ];

        // Clean barcode: remove spaces and special characters
        if ($this->filled('barcode')) {
            $data['barcode'] = preg_replace('/[^0-9A-Z]/', '', strtoupper($this->barcode));
        }

        $this->merge($data);
    }

    /** @return array<string, mixed> */
    public function variantData(): array
    {
        $data = $this->validated();
        $data['track_lot'] ??= false;
        $data['track_serial'] ??= false;
        $data['is_active'] ??= true;
        $data['meta'] = [];

        return $data;
    }
}
