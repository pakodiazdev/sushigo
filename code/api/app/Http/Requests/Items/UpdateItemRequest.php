<?php

namespace App\Http\Requests\Items;

use App\Models\Item;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/**
 * @OA\Schema(
 *   schema="UpdateItemRequest",
 *   @OA\Property(property="name", type="string", maxLength=255, example="Arroz Sushi Premium", description="Item name"),
 *   @OA\Property(property="description", type="string", example="Arroz japonés premium para sushi", description="Item description"),
 *   @OA\Property(property="is_stocked", type="boolean", example=true, description="Track in inventory"),
 *   @OA\Property(property="is_perishable", type="boolean", example=false, description="Has expiration date"),
 *   @OA\Property(property="is_manufactured", type="boolean", example=true, description="Manufactured in-house (true) or purchased for resale (false)"),
 *   @OA\Property(property="is_active", type="boolean", example=true, description="Active status"),
 * )
 */
class UpdateItemRequest extends FormRequest
{
    public function authorize(): bool
    {
        $item = Item::findOrFail($this->route('id'));
        return $this->user()->can('update', $item);
    }

    public function rules(): array
    {
        return [
            'name' => ['sometimes', 'string', 'max:255'],
            'description' => ['sometimes', 'nullable', 'string'],
            'is_stocked' => ['sometimes', 'boolean'],
            'is_perishable' => ['sometimes', 'boolean'],
            'is_manufactured' => ['sometimes', 'boolean'],
            'is_active' => ['sometimes', 'boolean'],
        ];
    }
}
