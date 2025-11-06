<?php

namespace App\Http\Requests\Items;

use App\Models\ItemVariant;
use Illuminate\Foundation\Http\FormRequest;

/**
 * @OA\Schema(
 *   schema="UpdateItemVariantRequest",
 *   @OA\Property(property="name", type="string", maxLength=255, example="Arroz Premium 1kg", description="Variant name"),
 *   @OA\Property(property="description", type="string", example="Presentación de 1 kilogramo", description="Variant description"),
 *   @OA\Property(property="track_lot", type="boolean", example=false, description="Track lot numbers"),
 *   @OA\Property(property="track_serial", type="boolean", example=false, description="Track serial numbers"),
 *   @OA\Property(property="sale_price", type="number", format="float", example=35.00, description="Default sale price"),
 *   @OA\Property(property="min_stock", type="number", format="float", example=10.00, description="Minimum stock level"),
 *   @OA\Property(property="max_stock", type="number", format="float", example=100.00, description="Maximum stock level"),
 *   @OA\Property(property="is_active", type="boolean", example=true, description="Active status"),
 * )
 */
class UpdateItemVariantRequest extends FormRequest
{
    public function authorize(): bool
    {
        $variant = ItemVariant::findOrFail($this->route('id'));
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
            'min_stock' => ['sometimes', 'numeric', 'min:0'],
            'max_stock' => ['sometimes', 'numeric', 'min:0'],
            'is_active' => ['sometimes', 'boolean'],
        ];
    }

    public function withValidator($validator): void
    {
        $validator->after(function ($validator) {
            if ($this->filled('min_stock') && $this->filled('max_stock')) {
                if ($this->max_stock < $this->min_stock) {
                    $validator->errors()->add('max_stock', 'Maximum stock must be greater than or equal to minimum stock');
                }
            }
        });
    }
}
