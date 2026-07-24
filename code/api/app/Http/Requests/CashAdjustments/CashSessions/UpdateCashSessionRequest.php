<?php

namespace App\Http\Requests\CashAdjustments\CashSessions;

use App\Http\Requests\Concerns\CastsRequestFields;
use App\Http\Requests\Concerns\SharesValidationMessages;
use Illuminate\Foundation\Http\FormRequest;

/**
 * @OA\Schema(
 *   schema="UpdateCashSessionRequest",
 *
 *   @OA\Property(property="opening_balance", type="number", format="decimal", example=1000.00, description="Opening balance"),
 *   @OA\Property(property="closing_balance", type="number", format="decimal", example=2500.00, description="Closing balance"),
 *   @OA\Property(property="meta", type="object", example={"note": "Evening shift"}, description="Additional metadata", nullable=true),
 * )
 */
class UpdateCashSessionRequest extends FormRequest
{
    use CastsRequestFields;
    use SharesValidationMessages;

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
        return $this->sharedMessages(['opening_balance.min', 'closing_balance.min']);
    }

    public function prepareForValidation(): void
    {
        $this->castToFloat('opening_balance');
        $this->castToFloat('closing_balance');
    }
}
