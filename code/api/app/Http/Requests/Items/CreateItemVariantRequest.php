<?php

namespace App\Http\Requests\Items;

use Illuminate\Foundation\Http\FormRequest;

/**
 * @OA\Schema(
 *   schema="CreateItemVariantRequest",
 *   required={"item_id", "uom_id", "code", "name"},
 *   @OA\Property(property="item_id", type="integer", example=1, description="Parent item ID"),
 *   @OA\Property(property="uom_id", type="integer", example=1, description="Base unit of measure ID"),
 *   @OA\Property(property="code", type="string", maxLength=100, example="ARR-KG", description="Unique variant code"),
 *   @OA\Property(property="name", type="string", maxLength=255, example="Arroz Premium 1kg", description="Variant name"),
 *   @OA\Property(property="description", type="string", example="Presentación de 1 kilogramo", description="Variant description"),
 *   @OA\Property(property="track_lot", type="boolean", example=false, description="Track lot numbers (default: false)"),
 *   @OA\Property(property="track_serial", type="boolean", example=false, description="Track serial numbers (default: false)"),
 *   @OA\Property(property="sale_price", type="number", format="float", example=35.00, description="Default sale price"),
 *   @OA\Property(property="min_stock", type="number", format="float", example=10.00, description="Minimum stock level"),
 *   @OA\Property(property="max_stock", type="number", format="float", example=100.00, description="Maximum stock level"),
 *   @OA\Property(property="is_active", type="boolean", example=true, description="Active status (default: true)"),
 * )
 */
class CreateItemVariantRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->can('create', \App\Models\ItemVariant::class);
    }

    public function rules(): array
    {
        return [
            'item_id' => ['required', 'integer', 'exists:items,id'],
            'uom_id' => ['required', 'integer', 'exists:units_of_measure,id'],
            'code' => ['required', 'string', 'max:100', 'unique:item_variants,code'],
            'name' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'track_lot' => ['nullable', 'boolean'],
            'track_serial' => ['nullable', 'boolean'],
            'sale_price' => ['nullable', 'numeric', 'min:0'],
            'min_stock' => ['nullable', 'numeric', 'min:0'],
            'max_stock' => ['nullable', 'numeric', 'min:0'],
            'is_active' => ['nullable', 'boolean'],
        ];
    }

    public function prepareForValidation(): void
    {
        $this->merge([
            'code' => strtoupper($this->code ?? ''),
        ]);
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
