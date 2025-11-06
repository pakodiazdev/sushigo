<?php

namespace App\Http\Requests\Stock;

use Illuminate\Foundation\Http\FormRequest;

/**
 * @OA\Schema(
 *   schema="ListStockRequest",
 *   @OA\Property(property="inventory_location_id", type="integer", example=1),
 *   @OA\Property(property="item_variant_id", type="integer", example=1),
 *   @OA\Property(property="min_on_hand", type="number", format="float", example=10.0),
 *   @OA\Property(property="per_page", type="integer", example=15),
 * )
 */
class ListStockRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'inventory_location_id' => ['nullable', 'integer', 'exists:inventory_locations,id'],
            'item_variant_id' => ['nullable', 'integer', 'exists:item_variants,id'],
            'min_on_hand' => ['nullable', 'numeric', 'min:0'],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:100'],
        ];
    }
}
