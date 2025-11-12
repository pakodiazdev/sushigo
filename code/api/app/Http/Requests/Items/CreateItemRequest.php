<?php

namespace App\Http\Requests\Items;

use App\Models\Item;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/**
 * @OA\Schema(
 *   schema="CreateItemRequest",
 *   required={"sku", "name", "type"},
 *   @OA\Property(property="sku", type="string", maxLength=100, example="INS-001", description="Unique SKU code"),
 *   @OA\Property(property="name", type="string", maxLength=255, example="Arroz Sushi Premium", description="Item name"),
 *   @OA\Property(property="description", type="string", example="Arroz japonés premium para sushi", description="Item description"),
 *   @OA\Property(property="type", type="string", enum={"INSUMO", "PRODUCTO", "ACTIVO"}, example="INSUMO", description="Item type"),
 *   @OA\Property(property="is_stocked", type="boolean", example=true, description="Track in inventory (default: true)"),
 *   @OA\Property(property="is_perishable", type="boolean", example=false, description="Has expiration date (default: false)"),
 *   @OA\Property(property="is_manufactured", type="boolean", example=true, description="Manufactured in-house (true) or purchased for resale (false) - default: true"),
 *   @OA\Property(property="is_active", type="boolean", example=true, description="Active status (default: true)"),
 * )
 */
class CreateItemRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->can('create', Item::class);
    }

    public function rules(): array
    {
        return [
            'sku' => ['required', 'string', 'max:100', 'unique:items,sku'],
            'name' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'type' => ['required', 'string', Rule::in([Item::TYPE_INSUMO, Item::TYPE_PRODUCTO, Item::TYPE_ACTIVO])],
            'is_stocked' => ['nullable', 'boolean'],
            'is_perishable' => ['nullable', 'boolean'],
            'is_manufactured' => ['nullable', 'boolean'],
            'is_active' => ['nullable', 'boolean'],
        ];
    }

    public function prepareForValidation(): void
    {
        $this->merge([
            'sku' => strtoupper($this->sku ?? ''),
            'type' => strtoupper($this->type ?? ''),
        ]);
    }
}
