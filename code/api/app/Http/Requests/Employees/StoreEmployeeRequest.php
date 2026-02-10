<?php

namespace App\Http\Requests\Employees;

use App\Enums\EmployeeRole;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/**
 * @OA\Schema(
 *   schema="StoreEmployeeRequest",
 *   required={"code", "first_name", "last_name", "role"},
 *   @OA\Property(property="code", type="string", maxLength=20, example="EMP-001", description="Unique employee code"),
 *   @OA\Property(property="first_name", type="string", maxLength=100, example="Juan", description="Employee first name"),
 *   @OA\Property(property="last_name", type="string", maxLength=100, example="Perez", description="Employee last name"),
 *   @OA\Property(property="role", type="string", enum={"MANAGER", "COOK", "KITCHEN_ASSISTANT", "DELIVERY_DRIVER"}, example="COOK"),
 *   @OA\Property(property="user_id", type="integer", nullable=true, example=null, description="Optional linked user ID"),
 *   @OA\Property(property="meta", type="object", nullable=true, description="Additional metadata"),
 * )
 */
class StoreEmployeeRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'code' => ['required', 'string', 'max:20', 'unique:employees,code'],
            'first_name' => ['required', 'string', 'max:100'],
            'last_name' => ['required', 'string', 'max:100'],
            'role' => ['required', 'string', Rule::in(array_column(EmployeeRole::cases(), 'value'))],
            'user_id' => ['nullable', 'integer', 'exists:users,id'],
            'meta' => ['nullable', 'array'],
        ];
    }

    public function prepareForValidation(): void
    {
        if ($this->has('code')) {
            $this->merge(['code' => strtoupper($this->code)]);
        }
        if ($this->has('role')) {
            $this->merge(['role' => strtoupper($this->role)]);
        }
    }
}
