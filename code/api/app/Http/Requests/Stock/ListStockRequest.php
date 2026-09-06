<?php

namespace App\Http\Requests\Stock;

use Illuminate\Foundation\Http\FormRequest;

/**
 * @OA\Schema(
 *   schema="ListStockRequest",
 *
 *   @OA\Property(property="inventory_location_id", type="string", example="01K4M6QY8E2B7N9Z3T5V1W0XCD"),
 *   @OA\Property(property="item_variant_id", type="string", example="01K4M6QY8E2B7N9Z3T5V1W0XCE"),
 *   @OA\Property(property="min_on_hand", type="number", format="float", example=10.0),
 *   @OA\Property(property="low_stock", type="boolean", example=true, description="Only rows at or below their resolved per-location replenishment reorder point (#439)"),
 *   @OA\Property(property="per_page", type="integer", example=15, description="1–500; clients page through with the `page` param"),
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
            'inventory_location_id' => ['nullable', 'string', 'exists:inventory_locations,public_id'],
            'item_variant_id' => ['nullable', 'string', 'exists:item_variants,public_id'],
            'min_on_hand' => ['nullable', 'numeric', 'min:0'],
            'low_stock' => ['nullable', 'boolean'],
            // Existencias (#571) pages through its whole managed row set
            // client-side, but the per-request bound still has to comfortably
            // cover a realistic single-branch page — the former max:100
            // silently 422'd the dashboard's request.
            'per_page' => ['nullable', 'integer', 'min:1', 'max:500'],
        ];
    }
}
