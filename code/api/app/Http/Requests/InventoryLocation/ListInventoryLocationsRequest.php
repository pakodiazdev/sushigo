<?php

namespace App\Http\Requests\InventoryLocation;

use Illuminate\Foundation\Http\FormRequest;

/**
 * @OA\Schema(
 *   schema="ListInventoryLocationsRequest",
 *
 *   @OA\Property(property="operating_unit_id", type="integer", example=1, description="Filter by operating unit"),
 *   @OA\Property(property="type", type="string", enum={"MAIN", "TEMP", "KITCHEN", "BAR", "RETURN"}, example="MAIN", description="Filter by location type"),
 *   @OA\Property(property="is_active", type="boolean", example=true, description="Filter by active status"),
 *   @OA\Property(property="can_receive_purchases", type="boolean", example=true, description="Filter by purchase-receiving capability (#568). Applied inside the caller's Operating Unit scope."),
 *   @OA\Property(property="per_page", type="integer", example=15, description="Items per page"),
 * )
 */
class ListInventoryLocationsRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    protected function prepareForValidation(): void
    {
        // Convert string "true"/"false" from query params to actual booleans
        if ($this->has('is_active')) {
            $this->merge([
                'is_active' => filter_var($this->is_active, FILTER_VALIDATE_BOOLEAN, FILTER_NULL_ON_FAILURE),
            ]);
        }

        if ($this->has('can_receive_purchases')) {
            $this->merge([
                'can_receive_purchases' => filter_var($this->can_receive_purchases, FILTER_VALIDATE_BOOLEAN, FILTER_NULL_ON_FAILURE),
            ]);
        }
    }

    public function rules(): array
    {
        return [
            'operating_unit_id' => ['nullable', 'integer', 'exists:operating_units,id'],
            'type' => ['nullable', 'string', 'in:MAIN,TEMP,KITCHEN,BAR,RETURN'],
            'is_active' => ['nullable', 'boolean'],
            'can_receive_purchases' => ['nullable', 'boolean'],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:100'],
        ];
    }
}
