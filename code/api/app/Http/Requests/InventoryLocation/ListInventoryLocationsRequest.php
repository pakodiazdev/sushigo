<?php

namespace App\Http\Requests\InventoryLocation;

use Illuminate\Foundation\Http\FormRequest;

/**
 * @OA\Schema(
 *   schema="ListInventoryLocationsRequest",
 *   @OA\Property(property="operating_unit_id", type="integer", example=1, description="Filter by operating unit"),
 *   @OA\Property(property="type", type="string", enum={"MAIN", "TEMP", "KITCHEN", "BAR", "RETURN"}, example="MAIN", description="Filter by location type"),
 *   @OA\Property(property="is_active", type="boolean", example=true, description="Filter by active status"),
 *   @OA\Property(property="per_page", type="integer", example=15, description="Items per page"),
 * )
 */
class ListInventoryLocationsRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'operating_unit_id' => ['nullable', 'integer', 'exists:operating_units,id'],
            'type' => ['nullable', 'string', 'in:MAIN,TEMP,KITCHEN,BAR,RETURN'],
            'is_active' => ['nullable', 'boolean'],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:100'],
        ];
    }
}
