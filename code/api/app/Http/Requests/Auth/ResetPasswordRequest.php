<?php

namespace App\Http\Requests\Auth;

use Illuminate\Foundation\Http\FormRequest;

/**
 * @OA\Schema(
 *   schema="ResetPasswordRequest",
 *   required={"token", "password", "password_confirmation"},
 *   @OA\Property(property="token", type="string", description="Password reset token"),
 *   @OA\Property(property="email", type="string", format="email", example="juan@sushigo.com", description="User email (required if phone not provided)"),
 *   @OA\Property(property="phone", type="string", example="+525512345678", description="User phone (required if email not provided)"),
 *   @OA\Property(property="password", type="string", format="password", minLength=8, example="newpassword123"),
 *   @OA\Property(property="password_confirmation", type="string", format="password", example="newpassword123"),
 * )
 */
class ResetPasswordRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'token' => ['required', 'string'],
            'email' => ['required_without:phone', 'nullable', 'string', 'email'],
            'phone' => ['required_without:email', 'nullable', 'string'],
            'password' => ['required', 'string', 'min:8', 'confirmed'],
            'password_confirmation' => ['required', 'string'],
        ];
    }

    public function messages(): array
    {
        return [
            'email.required_without' => 'Email es requerido si no se proporciona teléfono.',
            'phone.required_without' => 'Teléfono es requerido si no se proporciona email.',
            'password.confirmed' => 'La confirmación de contraseña no coincide.',
            'password.min' => 'La contraseña debe tener al menos 8 caracteres.',
        ];
    }
}
