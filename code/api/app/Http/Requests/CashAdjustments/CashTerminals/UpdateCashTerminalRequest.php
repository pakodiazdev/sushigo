<?php

namespace App\Http\Requests\CashAdjustments\CashTerminals;

use App\Http\Requests\Concerns\CastsRequestFields;
use Illuminate\Foundation\Http\FormRequest;

/**
 * @OA\Schema(
 *   schema="UpdateCashTerminalRequest",
 *
 *   @OA\Property(property="name", type="string", maxLength=255, example="Terminal CLIP 1", description="Terminal name"),
 *   @OA\Property(property="provider", type="string", maxLength=100, example="CLIP", description="Payment provider"),
 *   @OA\Property(property="account_ref", type="string", maxLength=255, example="ACC-12345", description="Provider account reference", nullable=true),
 *   @OA\Property(property="last_four", type="string", pattern="^[0-9]{4}$", example="1234", description="Last 4 digits", nullable=true),
 *   @OA\Property(property="is_active", type="boolean", example=true, description="Active status"),
 *   @OA\Property(property="meta", type="object", example={"serial": "SN123"}, description="Additional metadata", nullable=true),
 * )
 */
class UpdateCashTerminalRequest extends FormRequest
{
    use CastsRequestFields;

    public function authorize(): bool
    {
        return $this->user()->can('update', $this->route('cashTerminal'));
    }

    public function rules(): array
    {
        return [
            'name' => 'sometimes|string|max:255',
            'provider' => 'sometimes|string|max:100',
            'account_ref' => 'nullable|string|max:255',
            'last_four' => 'nullable|string|size:4|regex:/^[0-9]{4}$/',
            'is_active' => 'boolean',
            'meta' => 'nullable|array',
        ];
    }

    public function messages(): array
    {
        return [
            'last_four.size' => 'Deben ser exactamente 4 dígitos',
            'last_four.regex' => 'Solo se permiten números',
        ];
    }

    public function prepareForValidation(): void
    {
        $this->castToBoolean('is_active');
    }
}
