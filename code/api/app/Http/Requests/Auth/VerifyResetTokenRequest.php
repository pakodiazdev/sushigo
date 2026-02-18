<?php

namespace App\Http\Requests\Auth;

use Illuminate\Foundation\Http\FormRequest;

/**
 * @OA\Schema(
 *   schema="VerifyResetTokenRequest",
 *   required={"token"},
 *   @OA\Property(property="token", type="string", description="Password reset token to verify"),
 * )
 */
class VerifyResetTokenRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'token' => ['required', 'string'],
        ];
    }

    public function messages(): array
    {
        return [
            'token.required' => 'El token de restablecimiento es requerido.',
        ];
    }
}
