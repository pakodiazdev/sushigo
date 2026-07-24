<?php

namespace App\Http\Requests\CashAdjustments\CashExpenses;

use App\Http\Requests\Concerns\CastsRequestFields;
use App\Http\Requests\Concerns\SharesValidationMessages;
use App\Http\Requests\Concerns\ValidatesTenderTypeReference;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Validator;

/**
 * @OA\Schema(
 *   schema="UpdateCashExpenseRequest",
 *
 *   @OA\Property(property="tender_type", type="string", enum={"CASH", "CARD", "TRANSFER"}, example="CASH", description="Payment tender type"),
 *   @OA\Property(property="amount", type="number", format="decimal", example=150.00, description="Expense amount"),
 *   @OA\Property(property="category", type="string", maxLength=100, example="SUPPLIES", description="Expense category"),
 *   @OA\Property(property="vendor", type="string", maxLength=255, example="Office Depot", description="Vendor name", nullable=true),
 *   @OA\Property(property="reference", type="string", maxLength=255, example="INV-12345", description="Invoice reference", nullable=true),
 *   @OA\Property(property="notes", type="string", maxLength=1000, example="Office supplies", description="Additional notes", nullable=true),
 *   @OA\Property(property="card_terminal_id", type="integer", example=1, description="Terminal ID (for CARD)", nullable=true),
 *   @OA\Property(property="bank_account_id", type="integer", example=1, description="Bank account ID (for TRANSFER)", nullable=true),
 *   @OA\Property(property="incurred_at", type="string", format="date-time", example="2025-12-13T10:30:00Z", description="Expense date/time"),
 *   @OA\Property(property="meta", type="object", example={"receipt_url": "https://..."}, description="Additional metadata", nullable=true),
 * )
 */
class UpdateCashExpenseRequest extends FormRequest
{
    use CastsRequestFields;
    use SharesValidationMessages;
    use ValidatesTenderTypeReference;

    public function authorize(): bool
    {
        $expense = $this->route('cashExpense');

        if ($expense->isPosted()) {
            return false;
        }

        return $this->user()->can('update', $expense);
    }

    public function rules(): array
    {
        return [
            'tender_type' => 'sometimes|in:CASH,CARD,TRANSFER',
            'amount' => 'sometimes|numeric|min:0.01|max:999999.99',
            'category' => 'sometimes|string|max:100',
            'vendor' => 'nullable|string|max:255',
            'reference' => 'nullable|string|max:255',
            'notes' => 'nullable|string|max:1000',
            'card_terminal_id' => 'nullable|integer|exists:cash_terminals,id',
            'bank_account_id' => 'nullable|integer|exists:bank_accounts,id',
            'incurred_at' => 'sometimes|date',
            'meta' => 'nullable|array',
        ];
    }

    public function messages(): array
    {
        return $this->sharedMessages(['tender_type.in', 'amount.min']);
    }

    public function withValidator(Validator $validator): void
    {
        $validator->after(function ($validator) {
            $expense = $this->route('cashExpense');

            $this->requireTenderTypeReference(
                $validator,
                $this->input('tender_type', $expense->tender_type),
                $this->input('card_terminal_id', $expense->card_terminal_id),
                $this->input('bank_account_id', $expense->bank_account_id)
            );
        });
    }

    public function prepareForValidation(): void
    {
        $this->castToFloat('amount');
    }
}
