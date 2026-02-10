<?php

namespace App\Http\Requests\Employees;

use App\Enums\EmployeeRole;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/**
 * @OA\Schema(
 *   schema="StoreEmployeeRequest",
 *   required={"code", "first_name", "last_name", "role", "password"},
 *   @OA\Property(property="code", type="string", maxLength=20, example="EMP-001", description="Unique employee code"),
 *   @OA\Property(property="first_name", type="string", maxLength=100, example="Juan", description="Employee first name"),
 *   @OA\Property(property="last_name", type="string", maxLength=100, example="Perez", description="Employee last name"),
 *   @OA\Property(property="role", type="string", enum={"MANAGER", "COOK", "KITCHEN_ASSISTANT", "DELIVERY_DRIVER"}, example="COOK"),
 *   @OA\Property(property="email", type="string", format="email", example="juan.perez@sushigo.com", description="Email for the system user (required if phone not provided)"),
 *   @OA\Property(property="phone", type="string", example="+525512345678", description="Phone for the system user (required if email not provided)"),
 *   @OA\Property(property="password", type="string", format="password", minLength=8, example="password123", description="Password for the system user"),
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
            'email' => ['required_without:phone', 'nullable', 'string', 'email', 'max:255', 'unique:users,email'],
            'phone' => ['required_without:email', 'nullable', 'string', 'max:20', 'unique:users,phone'],
            'password' => ['required', 'string', 'min:8'],
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

    public function messages(): array
    {
        return [
            'email.required_without' => 'Email is required when phone is not provided.',
            'phone.required_without' => 'Phone is required when email is not provided.',
            'password.required' => 'Password is required for the system user.',
        ];
    }
}
