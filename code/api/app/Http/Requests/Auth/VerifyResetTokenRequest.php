<?php

namespace App\Http\Requests\Auth;

use Illuminate\Foundation\Http\FormRequest;

/**
 * @OA\Schema(
 *   schema="VerifyResetTokenRequest",
 *   required={"t"},
 *
 *   @OA\Property(property="t", type="string", description="Combined reset param: {40-char token}.{24-char selector}"),
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
            't' => ['required', 'string'],
        ];
    }

    public function messages(): array
    {
        return [
            't.required' => 'El token de restablecimiento es requerido.',
        ];
    }
}
