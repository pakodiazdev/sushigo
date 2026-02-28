<?php

namespace App\Http\Requests\Employees;

use App\Models\Employee;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/**
 * @OA\Schema(
 *   schema="UpdateEmployeeRequest",
 *
 *   @OA\Property(property="first_name", type="string", maxLength=100, example="Juan"),
 *   @OA\Property(property="last_name", type="string", maxLength=100, example="Perez"),
 *   @OA\Property(property="roles", type="array", @OA\Items(type="string", enum={"manager", "cook", "kitchen-assistant", "delivery-driver", "acting-manager", "admin", "super-admin"}), example={"cook"}, description="Position roles (super-admin only visible to super-admins)"),
 *   @OA\Property(property="email", type="string", format="email", example="juan.perez@sushigo.com", description="User email (admin only)"),
 *   @OA\Property(property="phone", type="string", example="5512345678", description="National phone number (admin only)"),
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
            'roles.*' => ['string', Rule::in(Employee::getAssignableRolesFor($this->user()))],
            'meta' => ['nullable', 'array'],
        ];

        if ($this->user()->hasRole(['admin', 'super-admin'])) {
            /** @var Employee $employee */
            $employee = $this->route('employee');

            if ($employee->user_id) {
                $userId = $employee->user_id;

                // Validation interplay:
                // - `sometimes`: field skipped entirely if absent from request (partial update)
                // - `nullable`: allows explicit null/empty values through
                // - `required_without`: prevents clearing the ONLY contact method
                // Net result: admin can update one field without sending the other,
                // but cannot clear both email and phone simultaneously.
                $rules['email'] = [
                    'sometimes',
                    'nullable',
                    'string',
                    'email',
                    'max:255',
                    'required_without:phone',
                    Rule::unique('users', 'email')->ignore($userId),
                ];
                $rules['phone'] = [
                    'sometimes',
                    'nullable',
                    'string',
                    'regex:/^[0-9]{10}$/',
                    'required_without:email',
                    Rule::unique('users', 'phone')->ignore($userId),
                ];
            } elseif ($this->has('email') || $this->has('phone')) {
                $rules['email'] = ['prohibited'];
                $rules['phone'] = ['prohibited'];
            }
        }

        return $rules;
    }

    public function messages(): array
    {
        return [
            'email.required_without' => 'Email is required when phone is being cleared.',
            'phone.required_without' => 'Phone is required when email is being cleared.',
            'phone.regex' => 'Phone must be a 10-digit national number without country code.',
            'email.prohibited' => 'Cannot set email on an employee without a linked user account.',
            'phone.prohibited' => 'Cannot set phone on an employee without a linked user account.',
        ];
    }

    public function prepareForValidation(): void
    {
        if ($this->has('phone') && $this->phone) {
            $this->merge(['phone' => preg_replace('/[^0-9]/', '', $this->phone)]);
        }
    }
}
