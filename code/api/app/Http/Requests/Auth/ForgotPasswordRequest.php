<?php

namespace App\Http\Requests\Auth;

use Illuminate\Foundation\Http\FormRequest;

/**
 * @OA\Schema(
 *   schema="ForgotPasswordRequest",
 *   @OA\Property(property="email", type="string", format="email", example="juan@sushigo.com", description="User email (required if phone not provided)"),
 *   @OA\Property(property="phone", type="string", example="+525512345678", description="User phone (required if email not provided)"),
 * )
 */
class ForgotPasswordRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'email' => ['required_without:phone', 'nullable', 'string', 'email'],
            'phone' => ['required_without:email', 'nullable', 'string'],
        ];
    }

    public function messages(): array
    {
        return [
            'email.required_without' => 'Email es requerido si no se proporciona teléfono.',
            'phone.required_without' => 'Teléfono es requerido si no se proporciona email.',
        ];
    }
}
