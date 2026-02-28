<?php

namespace App\Http\Requests\CashAdjustments\CashSessions;

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
    public function authorize(): bool
    {
        return $this->user()->can('create', \App\Models\CashSession::class);
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
        return [
            'cash_register_id.required' => 'La caja es requerida',
            'cash_register_id.exists' => 'La caja no existe',
            'operating_date.required' => 'La fecha de operación es requerida',
            'operating_date.date_format' => 'La fecha debe estar en formato Y-m-d',
            'opening_balance.min' => 'El balance inicial debe ser mayor o igual a 0',
            'opening_balance.max' => 'El balance inicial no puede exceder 999,999.99',
        ];
    }

    public function prepareForValidation(): void
    {
        if ($this->has('opening_balance') && is_string($this->opening_balance)) {
            $this->merge([
                'opening_balance' => (float) $this->opening_balance,
            ]);
        }
    }
}
