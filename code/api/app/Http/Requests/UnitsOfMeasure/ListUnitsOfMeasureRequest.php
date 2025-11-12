<?php

namespace App\Http\Requests\UnitsOfMeasure;

use Illuminate\Foundation\Http\FormRequest;

/**
 * @OA\Schema(
 *   schema="ListUnitsOfMeasureRequest",
 *   @OA\Property(property="is_active", type="boolean", example=true, description="Filter by active status"),
 *   @OA\Property(property="is_decimal", type="boolean", example=true, description="Filter by decimal support"),
 *   @OA\Property(property="per_page", type="integer", example=15, description="Items per page"),
 * )
 */
class ListUnitsOfMeasureRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true; // Public endpoint
    }

    protected function prepareForValidation(): void
    {
        // Convert string "true"/"false" from query params to actual booleans
        $filters = [];
        
        if ($this->has('is_active')) {
            $filters['is_active'] = filter_var($this->is_active, FILTER_VALIDATE_BOOLEAN, FILTER_NULL_ON_FAILURE);
        }
        
        if ($this->has('is_decimal')) {
            $filters['is_decimal'] = filter_var($this->is_decimal, FILTER_VALIDATE_BOOLEAN, FILTER_NULL_ON_FAILURE);
        }
        
        $this->merge($filters);
    }

    public function rules(): array
    {
        return [
            'is_active' => ['nullable', 'boolean'],
            'is_decimal' => ['nullable', 'boolean'],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:100'],
        ];
    }
}
