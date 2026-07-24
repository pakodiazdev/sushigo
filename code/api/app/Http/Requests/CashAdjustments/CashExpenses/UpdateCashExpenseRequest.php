<?php

namespace App\Http\Requests\CashAdjustments\CashExpenses;

use App\Http\Requests\Concerns\CastsRequestFields;
use App\Http\Requests\Concerns\ResolvesPublicIdReferences;
use App\Http\Requests\Concerns\SharesValidationMessages;
use App\Http\Requests\Concerns\ValidatesTenderTypeReference;
use App\Models\BankAccount;
use App\Models\CashTerminal;
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
 *   @OA\Property(property="card_terminal_id", type="string", example="01JKABC0987654321ZYXWVUTS", description="Cash Terminal public_id (for CARD)", nullable=true),
 *   @OA\Property(property="bank_account_id", type="string", example="01JKABC0987654321ZYXWVUTS", description="Bank Account public_id (for TRANSFER)", nullable=true),
 *   @OA\Property(property="incurred_at", type="string", format="date-time", example="2025-12-13T10:30:00Z", description="Expense date/time"),
 *   @OA\Property(property="meta", type="object", example={"receipt_url": "https://..."}, description="Additional metadata", nullable=true),
 * )
 */
class UpdateCashExpenseRequest extends FormRequest
{
    use CastsRequestFields;
    use ResolvesPublicIdReferences;
    use SharesValidationMessages;
    use ValidatesTenderTypeReference;

    public function authorize(): bool
    {
        $cashExpense = $this->route('cashExpense');

        if ($cashExpense->isPosted()) {
            return false;
        }

        return $this->user()->can('update', $cashExpense);
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
            'card_terminal_id' => 'nullable|string|exists:cash_terminals,public_id',
            'bank_account_id' => 'nullable|string|exists:bank_accounts,public_id',
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
            $cashExpense = $this->route('cashExpense');

            $this->requireTenderTypeReference(
                $validator,
                $this->input('tender_type', $cashExpense->tender_type),
                $this->input('card_terminal_id', $cashExpense->card_terminal_id),
                $this->input('bank_account_id', $cashExpense->bank_account_id)
            );
        });
    }

    public function prepareForValidation(): void
    {
        $this->castToFloat('amount');
    }

    /**
     * Validated data with card_terminal_id/bank_account_id resolved from
     * public_id to the numeric FK the model column stores.
     */
    public function expenseData(): array
    {
        $data = $this->validated();

        if (array_key_exists('card_terminal_id', $data)) {
            $data['card_terminal_id'] = $this->resolvePublicId(CashTerminal::class, 'card_terminal_id');
        }

        if (array_key_exists('bank_account_id', $data)) {
            $data['bank_account_id'] = $this->resolvePublicId(BankAccount::class, 'bank_account_id');
        }

        return $data;
    }
}
