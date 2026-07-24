<?php

namespace App\Http\Requests\CashAdjustments\CashSessions;

use App\Http\Requests\Concerns\CastsRequestFields;
use App\Http\Requests\Concerns\SharesValidationMessages;
use App\Models\CashSession;
use Illuminate\Foundation\Http\FormRequest;

/**
 * @OA\Schema(
 *   schema="StoreCashSessionRequest",
 *   required={"cash_register_id", "operating_date"},
 *
 *   @OA\Property(property="cash_register_id", type="integer", example=1, description="Cash Register ID"),
 *   @OA\Property(property="operating_date", type="string", format="date", example="2025-12-13", description="Operating date (YYYY-MM-DD)"),
 *   @OA\Property(property="opening_balance", type="number", format="decimal", example=1000.00, description="Opening balance (defaults to previous day closing)", nullable=true),
 *   @OA\Property(property="meta", type="object", example={"note": "Morning shift"}, description="Additional metadata", nullable=true),
 * )
 */
class StoreCashSessionRequest extends FormRequest
{
    use CastsRequestFields;
    use SharesValidationMessages;

    public function authorize(): bool
    {
        return $this->user()->can('create', CashSession::class);
    }

    public function rules(): array
    {
        return [
            'cash_register_id' => 'required|integer|exists:cash_registers,id',
            'operating_date' => 'required|date|date_format:Y-m-d',
            'opening_balance' => 'nullable|numeric|min:0|max:999999.99',
            'meta' => 'nullable|array',
        ];
    }

    public function messages(): array
    {
        return $this->sharedMessages([
            'cash_register_id.required',
            'cash_register_id.exists',
            'operating_date.required',
            'operating_date.date_format',
            'opening_balance.min',
            'opening_balance.max',
        ]);
    }

    public function prepareForValidation(): void
    {
        $this->castToFloat('opening_balance');
    }
}
