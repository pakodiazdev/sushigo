<?php

namespace App\Http\Requests\CashAdjustments\CashExpenses;

use App\Http\Requests\Concerns\CastsRequestFields;
use App\Http\Requests\Concerns\ValidatesTenderTypeReference;
use App\Models\CashExpense;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Validator;

/**
 * @OA\Schema(
 *   schema="StoreCashExpenseRequest",
 *   required={"cash_session_id", "tender_type", "amount", "category"},
 *
 *   @OA\Property(property="cash_session_id", type="integer", example=1, description="Cash Session ID"),
 *   @OA\Property(property="tender_type", type="string", enum={"CASH", "CARD", "TRANSFER"}, example="CASH", description="Payment tender type"),
 *   @OA\Property(property="amount", type="number", format="decimal", example=150.00, description="Expense amount"),
 *   @OA\Property(property="category", type="string", maxLength=100, example="SUPPLIES", description="Expense category (e.g., SUPPLIES, MAINTENANCE, UTILITIES)"),
 *   @OA\Property(property="vendor", type="string", maxLength=255, example="Office Depot", description="Vendor name", nullable=true),
 *   @OA\Property(property="reference", type="string", maxLength=255, example="INV-12345", description="Invoice or receipt reference", nullable=true),
 *   @OA\Property(property="notes", type="string", maxLength=1000, example="Office supplies purchase", description="Additional notes", nullable=true),
 *   @OA\Property(property="card_terminal_id", type="integer", example=1, description="Terminal ID (required for CARD)", nullable=true),
 *   @OA\Property(property="bank_account_id", type="integer", example=1, description="Bank account ID (required for TRANSFER)", nullable=true),
 *   @OA\Property(property="incurred_at", type="string", format="date-time", example="2025-12-13T10:30:00Z", description="Expense date/time (defaults to now)", nullable=true),
 *   @OA\Property(property="meta", type="object", example={"receipt_url": "https://..."}, description="Additional metadata", nullable=true),
 * )
 */
class StoreCashExpenseRequest extends FormRequest
{
    use CastsRequestFields;
    use ValidatesTenderTypeReference;

    public function authorize(): bool
    {
        return $this->user()->can('create', CashExpense::class);
    }

    public function rules(): array
    {
        return [
            'cash_session_id' => 'required|integer|exists:cash_sessions,id',
            'tender_type' => 'required|in:CASH,CARD,TRANSFER',
            'amount' => 'required|numeric|min:0.01|max:999999.99',
            'category' => 'required|string|max:100',
            'vendor' => 'nullable|string|max:255',
            'reference' => 'nullable|string|max:255',
            'notes' => 'nullable|string|max:1000',
            'card_terminal_id' => 'nullable|integer|exists:cash_terminals,id',
            'bank_account_id' => 'nullable|integer|exists:bank_accounts,id',
            'incurred_at' => 'nullable|date',
            'meta' => 'nullable|array',
        ];
    }

    public function messages(): array
    {
        return [
            'cash_session_id.required' => 'La sesión de caja es requerida',
            'tender_type.required' => 'El tipo de tender es requerido',
            'tender_type.in' => 'El tipo de tender debe ser CASH, CARD o TRANSFER',
            'amount.required' => 'El monto es requerido',
            'amount.min' => 'El monto debe ser mayor a 0',
            'category.required' => 'La categoría es requerida',
        ];
    }

    public function withValidator(Validator $validator): void
    {
        $validator->after(function ($validator) {
            $this->requireTenderTypeReference(
                $validator,
                $this->input('tender_type'),
                $this->input('card_terminal_id'),
                $this->input('bank_account_id')
            );
        });
    }

    public function prepareForValidation(): void
    {
        $this->castToFloat('amount');
    }
}
