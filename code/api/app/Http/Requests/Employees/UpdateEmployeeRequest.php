<?php

namespace App\Http\Requests\Employees;

use App\Models\Employee;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/**
 * @OA\Schema(
 *   schema="UpdateEmployeeRequest",
 *   @OA\Property(property="first_name", type="string", maxLength=100, example="Juan"),
 *   @OA\Property(property="last_name", type="string", maxLength=100, example="Perez"),
 *   @OA\Property(property="roles", type="array", @OA\Items(type="string", enum={"employee-manager", "employee-cook", "employee-kitchen-assistant", "employee-delivery-driver", "employee-acting-manager"}), example={"employee-cook"}, description="Position roles"),
 *   @OA\Property(property="email", type="string", format="email", example="juan.perez@sushigo.com", description="User email (admin only)"),
 *   @OA\Property(property="phone", type="string", example="5512345678", description="National phone number (admin only)"),
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
        $rules = [
            'first_name' => ['sometimes', 'string', 'max:100'],
            'last_name' => ['sometimes', 'string', 'max:100'],
            'roles' => ['sometimes', 'array', 'min:1'],
            'roles.*' => ['string', Rule::in(Employee::POSITION_ROLES)],
            'user_id' => ['nullable', 'integer', 'exists:users,id'],
            'meta' => ['nullable', 'array'],
        ];

        if ($this->user()->hasRole(['admin', 'super-admin'])) {
            /** @var Employee $employee */
            $employee = $this->route('employee');
            $userId = $employee->user_id;

            $rules['email'] = [
                'sometimes', 'nullable', 'string', 'email', 'max:255',
                Rule::unique('users', 'email')->ignore($userId),
            ];
            $rules['phone'] = [
                'sometimes', 'nullable', 'string', 'regex:/^[0-9]{10}$/',
                Rule::unique('users', 'phone')->ignore($userId),
            ];
        }

        return $rules;
    }

    public function prepareForValidation(): void
    {
        if ($this->has('phone') && $this->phone) {
            $this->merge(['phone' => preg_replace('/[^0-9]/', '', $this->phone)]);
        }
    }
}
