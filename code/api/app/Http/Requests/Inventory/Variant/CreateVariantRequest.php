<?php

declare(strict_types=1);

namespace App\Http\Requests\Inventory\Variant;

use App\Http\Requests\Concerns\ResolvesPublicIdReferences;
use App\Models\Item;
use App\Models\ItemVariant;
use App\Models\UnitOfMeasure;
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
 *   @OA\Property(property="uom_id", type="string", example="01K4M6QY8E2B7N9Z3T5V1W0XCD", description="Base unit of measure public ID"),
 *   @OA\Property(property="description", type="string", nullable=true),
 *   @OA\Property(property="track_lot", type="boolean", example=false, description="Track lot numbers (default: false)"),
 *   @OA\Property(property="track_serial", type="boolean", example=false, description="Track serial numbers (default: false)"),
 *   @OA\Property(property="is_active", type="boolean", example=true, description="Active status (default: true)"),
 * )
 */
class CreateVariantRequest extends FormRequest
{
    public const DUPLICATE_CODE_MESSAGE = 'El SKU ya está en uso. Revisa la nueva sugerencia y vuelve a enviar el formulario.';

    use ResolvesPublicIdReferences;

    public function authorize(): bool
    {
        Item::where('type', Item::TYPE_PRODUCTO)->where('public_id', $this->route('id'))->firstOrFail();

        return $this->user()->can('create', ItemVariant::class);
    }

    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:255'],
            // The database constraint is authoritative. Handling the collision after the insert
            // lets the API return a fresh contextual suggestion even when the code was claimed
            // between suggestion and submission.
            'code' => ['required', 'string', 'max:100'],
            'barcode' => ['nullable', 'string', 'max:50', 'unique:item_variants,barcode'],
            'uom_id' => ['required', 'string', 'exists:units_of_measure,public_id'],
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
        $data['uom_id'] = $this->resolvePublicId(UnitOfMeasure::class, 'uom_id');
        $data['track_lot'] ??= false;
        $data['track_serial'] ??= false;
        $data['is_active'] ??= true;
        $data['meta'] = [];

        return $data;
    }
}
