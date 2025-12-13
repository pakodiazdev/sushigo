<?php

namespace App\Http\Requests\CashAdjustments\CashSessions;

use Illuminate\Foundation\Http\FormRequest;

/**
 * @OA\Schema(
 *   schema="UpdateCashSessionRequest",
 *   @OA\Property(property="opening_balance", type="number", format="decimal", example=1000.00, description="Opening balance"),
 *   @OA\Property(property="closing_balance", type="number", format="decimal", example=2500.00, description="Closing balance"),
 *   @OA\Property(property="meta", type="object", example={"note": "Evening shift"}, description="Additional metadata", nullable=true),
 * )
 */
class UpdateCashSessionRequest extends FormRequest
{
    public function authorize(): bool
    {
        $session = $this->route('cashSession');

        if ($session->isPosted()) {
            return false;
        }

        return $this->user()->can('update', $session);
    }

    public function rules(): array
    {
        return [
            'opening_balance' => 'sometimes|numeric|min:0|max:999999.99',
            'closing_balance' => 'sometimes|numeric|min:0|max:999999.99',
            'meta' => 'nullable|array',
        ];
    }

    public function messages(): array
    {
        return [
            'opening_balance.min' => 'El balance inicial debe ser mayor o igual a 0',
            'closing_balance.min' => 'El balance de cierre debe ser mayor o igual a 0',
        ];
    }

    public function prepareForValidation(): void
    {
        if ($this->has('opening_balance') && is_string($this->opening_balance)) {
            $this->merge([
                'opening_balance' => (float) $this->opening_balance,
            ]);
        }

        if ($this->has('closing_balance') && is_string($this->closing_balance)) {
            $this->merge([
                'closing_balance' => (float) $this->closing_balance,
            ]);
        }
    }
}
