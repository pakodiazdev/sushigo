<?php

namespace App\Http\Requests\Employees;

use App\Enums\EmployeeRole;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/**
 * @OA\Schema(
 *   schema="UpdateEmployeeRequest",
 *   @OA\Property(property="first_name", type="string", maxLength=100, example="Juan"),
 *   @OA\Property(property="last_name", type="string", maxLength=100, example="Perez"),
 *   @OA\Property(property="role", type="string", enum={"MANAGER", "COOK", "KITCHEN_ASSISTANT", "DELIVERY_DRIVER"}, example="COOK"),
 *   @OA\Property(property="user_id", type="integer", nullable=true),
 *   @OA\Property(property="meta", type="object", nullable=true),
 * )
 */
class UpdateEmployeeRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'first_name' => ['sometimes', 'string', 'max:100'],
            'last_name' => ['sometimes', 'string', 'max:100'],
            'role' => ['sometimes', 'string', Rule::in(array_column(EmployeeRole::cases(), 'value'))],
            'user_id' => ['nullable', 'integer', 'exists:users,id'],
            'meta' => ['nullable', 'array'],
        ];
    }

    public function prepareForValidation(): void
    {
        if ($this->has('role')) {
            $this->merge(['role' => strtoupper($this->role)]);
        }
    }
}
