<?php

namespace App\Http\Requests\Auth;

use Illuminate\Foundation\Http\FormRequest;

/**
 * @OA\Schema(
 *   schema="RegisterRequestSchema",
 *   required={"name", "password"},
 *
 *   @OA\Property(property="name", type="string", example="John Doe"),
 *   @OA\Property(property="email", type="string", format="email", example="john@example.com", description="Required if phone is not provided"),
 *   @OA\Property(property="phone", type="string", example="5512345678", description="National phone number without country code (required if email not provided)"),
 *   @OA\Property(property="password", type="string", format="password", minLength=8, example="password123"),
 *   @OA\Property(property="password_confirmation", type="string", format="password", example="password123")
 * )
 */
class RegisterRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required_without:phone', 'nullable', 'string', 'email', 'max:255', 'unique:users,email'],
            'phone' => ['required_without:email', 'nullable', 'string', 'regex:/^[0-9]{10}$/', 'unique:users,phone'],
            'password' => ['required', 'string', 'min:8', 'confirmed'],
        ];
    }

    public function prepareForValidation(): void
    {
        if ($this->has('phone') && $this->phone) {
            $this->merge(['phone' => preg_replace('/[^0-9]/', '', $this->phone)]);
        }
    }

    public function messages(): array
    {
        return [
            'email.required_without' => 'Email is required when phone is not provided.',
            'phone.required_without' => 'Phone is required when email is not provided.',
        ];
    }
}
