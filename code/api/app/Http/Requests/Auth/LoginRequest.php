<?php

namespace App\Http\Requests\Auth;

use Illuminate\Foundation\Http\FormRequest;

/**
 * @OA\Schema(
 *   schema="LoginRequestSchema",
 *   required={"password"},
 *   @OA\Property(property="email", type="string", format="email", example="john@example.com", description="Required if phone is not provided"),
 *   @OA\Property(property="phone", type="string", example="+525512345678", description="Required if email is not provided"),
 *   @OA\Property(property="password", type="string", format="password", example="password123")
 * )
 */
class LoginRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'email'    => ['required_without:phone', 'nullable', 'string', 'email'],
            'phone'    => ['required_without:email', 'nullable', 'string', 'max:20'],
            'password' => ['required', 'string'],
        ];
    }

    public function messages(): array
    {
        return [
            'email.required_without' => 'Email is required when phone is not provided.',
            'phone.required_without' => 'Phone is required when email is not provided.',
        ];
    }
}
