<?php

namespace App\Http\Requests\Employees;

use Illuminate\Foundation\Http\FormRequest;

/**
 * @OA\Schema(
 *   schema="ListEmployeesRequest",
 *   @OA\Property(property="is_active", type="boolean", description="Filter by active status"),
 *   @OA\Property(property="role", type="string", enum={"employee-manager", "employee-cook", "employee-kitchen-assistant", "employee-delivery-driver", "employee-acting-manager"}, description="Filter by position role"),
 *   @OA\Property(property="search", type="string", description="Search in code, first_name, last_name"),
 *   @OA\Property(property="per_page", type="integer", example=15, description="Items per page"),
 * )
 */
class ListEmployeesRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    protected function prepareForValidation(): void
    {
        $filters = [];

        if ($this->has('is_active')) {
            $filters['is_active'] = filter_var($this->is_active, FILTER_VALIDATE_BOOLEAN, FILTER_NULL_ON_FAILURE);
        }

        $this->merge($filters);
    }

    public function rules(): array
    {
        return [
            'is_active' => ['nullable', 'boolean'],
            'role' => ['nullable', 'string'],
            'search' => ['nullable', 'string', 'max:100'],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:100'],
        ];
    }
}
