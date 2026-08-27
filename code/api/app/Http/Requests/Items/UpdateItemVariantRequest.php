<?php

namespace App\Http\Requests\Items;

use App\Models\Item;
use App\Models\ItemVariant;
use Illuminate\Foundation\Http\FormRequest;

/**
 * @OA\Schema(
 *   schema="UpdateItemVariantRequest",
 *
 *   @OA\Property(property="name", type="string", maxLength=255, example="Arroz Premium 1kg", description="Variant name"),
 *   @OA\Property(property="description", type="string", example="Presentación de 1 kilogramo", description="Variant description"),
 *   @OA\Property(property="track_lot", type="boolean", example=false, description="Track lot numbers"),
 *   @OA\Property(property="track_serial", type="boolean", example=false, description="Track serial numbers"),
 *   @OA\Property(property="sale_price", type="number", format="float", example=35.00, description="Default sale price"),
 *   @OA\Property(property="is_active", type="boolean", example=true, description="Active status"),
 * )
 */
class UpdateItemVariantRequest extends FormRequest
{
    public function authorize(): bool
    {
        $variant = ItemVariant::findByPublicIdOrFail($this->route('id'));

        return $this->user()->can('update', $variant);
    }

    public function rules(): array
    {
        return [
            'name' => ['sometimes', 'string', 'max:255'],
            'description' => ['sometimes', 'nullable', 'string'],
            'track_lot' => ['sometimes', 'boolean'],
            'track_serial' => ['sometimes', 'boolean'],
            'sale_price' => ['sometimes', 'nullable', 'numeric', 'min:0'],
            'is_active' => ['sometimes', 'boolean'],
        ];
    }

    public function withValidator($validator): void
    {
        $validator->after(function ($validator) {
            // A pre-existing Product variant (created before #429 closed this legacy path) must
            // not keep receiving writes here — it can only be managed via
            // PUT /inventory/products/{id}/variants/{variantId} (#425) from now on.
            $variant = ItemVariant::with('item')->where('public_id', $this->route('id'))->first();
            if ($variant?->item?->type === Item::TYPE_PRODUCTO) {
                $validator->errors()->add('item_id', 'This variant belongs to a Product and must be managed from the Product catalog.');
            }
        });
    }
}
