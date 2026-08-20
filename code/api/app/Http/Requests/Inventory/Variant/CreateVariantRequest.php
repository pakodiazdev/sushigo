<?php

declare(strict_types=1);

namespace App\Http\Requests\Inventory\Variant;

use App\Models\Item;
use App\Models\ItemVariant;
use Illuminate\Foundation\Http\FormRequest;

/**
 * Catalog-identity-only Variant write contract — never accepts acquisition
 * cost, sale price, or stock thresholds/balances. See
 * doc/architecture/product-catalog/product-catalog-architecture.en.md §6.
 *
 * @OA\Schema(
 *   schema="CreateVariantRequest",
 *   required={"name", "code", "uom_id"},
 *
 *   @OA\Property(property="name", type="string", maxLength=255, example="Arroz Premium 1kg"),
 *   @OA\Property(property="code", type="string", maxLength=100, example="ARR-KG", description="Variant SKU — unique across all variants"),
 *   @OA\Property(property="barcode", type="string", nullable=true, maxLength=50, example="7501234567890", description="Optional unit barcode — unique across all variants"),
 *   @OA\Property(property="uom_id", type="integer", example=1, description="Base unit of measure ID"),
 *   @OA\Property(property="description", type="string", nullable=true),
 *   @OA\Property(property="track_lot", type="boolean", example=false, description="Track lot numbers (default: false)"),
 *   @OA\Property(property="track_serial", type="boolean", example=false, description="Track serial numbers (default: false)"),
 *   @OA\Property(property="is_active", type="boolean", example=true, description="Active status (default: true)"),
 * )
 */
class CreateVariantRequest extends FormRequest
{
    public function authorize(): bool
    {
        Item::where('type', Item::TYPE_PRODUCTO)->findOrFail($this->route('id'));

        return $this->user()->can('create', ItemVariant::class);
    }

    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:255'],
            'code' => ['required', 'string', 'max:100', 'unique:item_variants,code'],
            'barcode' => ['nullable', 'string', 'max:50', 'unique:item_variants,barcode'],
            'uom_id' => ['required', 'integer', 'exists:units_of_measure,id'],
            'description' => ['nullable', 'string'],
            'track_lot' => ['nullable', 'boolean'],
            'track_serial' => ['nullable', 'boolean'],
            'is_active' => ['nullable', 'boolean'],
        ];
    }

    public function prepareForValidation(): void
    {
        $data = [
            'code' => strtoupper((string) $this->code),
        ];

        if ($this->filled('barcode')) {
            $data['barcode'] = preg_replace('/[^0-9A-Z]/', '', strtoupper((string) $this->barcode));
        }

        $this->merge($data);
    }

    /**
     * Validated fields ready for ItemVariant::create() — item_id is forced
     * from the route (Product-scoped, never from the body).
     *
     * @return array<string, mixed>
     */
    public function variantData(int $productId): array
    {
        $data = $this->validated();
        $data['item_id'] = $productId;
        $data['track_lot'] ??= false;
        $data['track_serial'] ??= false;
        $data['is_active'] ??= true;
        $data['meta'] = [];

        return $data;
    }
}
