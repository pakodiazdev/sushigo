<?php

namespace App\Http\Requests\Auth;

use Illuminate\Foundation\Http\FormRequest;

/**
 * @OA\Schema(
 *   schema="ResetPasswordRequest",
 *   required={"t", "password", "password_confirmation"},
 *
 *   @OA\Property(property="t", type="string", description="Combined reset param: {40-char token}.{24-char selector}"),
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
            't' => ['required', 'string'],
            'password' => ['required', 'string', 'min:8', 'confirmed'],
            'password_confirmation' => ['required', 'string'],
        ];
    }

    public function messages(): array
    {
        return [
            't.required' => 'El token de restablecimiento es requerido.',
            'password.confirmed' => 'La confirmación de contraseña no coincide.',
            'password.min' => 'La contraseña debe tener al menos 8 caracteres.',
        ];
    }
}
