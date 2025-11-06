<?php

namespace App\Http\Requests\Items;

use Illuminate\Foundation\Http\FormRequest;

/**
 * @OA\Schema(
 *   schema="ListItemsRequest",
 *   @OA\Property(property="type", type="string", enum={"INSUMO", "PRODUCTO", "ACTIVO"}, description="Filter by item type"),
 *   @OA\Property(property="is_stocked", type="boolean", description="Filter by stocked status"),
 *   @OA\Property(property="is_perishable", type="boolean", description="Filter by perishable status"),
 *   @OA\Property(property="is_active", type="boolean", description="Filter by active status"),
 *   @OA\Property(property="search", type="string", description="Search in SKU or name"),
 *   @OA\Property(property="per_page", type="integer", example=15, description="Items per page"),
 * )
 */
class ListItemsRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true; // Public endpoint
    }

    public function rules(): array
    {
        return [
            'type' => ['nullable', 'string'],
            'is_stocked' => ['nullable', 'boolean'],
            'is_perishable' => ['nullable', 'boolean'],
            'is_active' => ['nullable', 'boolean'],
            'search' => ['nullable', 'string', 'max:100'],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:100'],
        ];
    }
}
