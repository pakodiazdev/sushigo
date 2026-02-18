<?php

namespace App\Http\Requests\Employees;

use App\Http\Traits\HandlesSortableRequest;
use App\Models\Employee;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/**
 * @OA\Schema(
 *   schema="ListEmployeesRequest",
 *   @OA\Property(property="is_active", type="boolean", description="Filter by active status"),
 *   @OA\Property(property="role", type="string", enum={"manager", "cook", "kitchen-assistant", "delivery-driver", "acting-manager", "admin", "super-admin"}, description="Filter by position role"),
 *   @OA\Property(property="search", type="string", description="Search in code, first_name, last_name"),
 *   @OA\Property(property="per_page", type="integer", example=15, description="Items per page"),
 *   @OA\Property(property="sort", type="array", @OA\Items(type="string", example="code:asc"), description="Sort fields (field:direction)"),
 * )
 */
class ListEmployeesRequest extends FormRequest
{
    use HandlesSortableRequest;

    public function authorize(): bool
    {
        return true;
    }

    protected function sortableFields(): array
    {
        return ['code', 'first_name', 'last_name', 'is_active', 'created_at'];
    }

    protected function defaultSort(): array
    {
        return [['field' => 'code', 'direction' => 'asc']];
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
            'status' => ['nullable', 'string', 'in:baja'],
            'role' => ['nullable', 'string', Rule::in(Employee::POSITION_ROLES)],
            'search' => ['nullable', 'string', 'max:100'],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:100'],
            ...$this->sortRules(),
        ];
    }
}
