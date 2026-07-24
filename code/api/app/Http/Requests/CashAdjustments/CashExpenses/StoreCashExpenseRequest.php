<?php

namespace App\Http\Requests\CashAdjustments\CashExpenses;

use App\Http\Requests\Concerns\CastsRequestFields;
use App\Http\Requests\Concerns\ResolvesPublicIdReferences;
use App\Http\Requests\Concerns\SharesValidationMessages;
use App\Http\Requests\Concerns\ValidatesTenderTypeReference;
use App\Models\BankAccount;
use App\Models\CashExpense;
use App\Models\CashSession;
use App\Models\CashTerminal;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Validator;

/**
 * @OA\Schema(
 *   schema="StoreCashExpenseRequest",
 *   required={"cash_session_id", "tender_type", "amount", "category"},
 *
 *   @OA\Property(property="cash_session_id", type="string", example="01JKABC0987654321ZYXWVUTS", description="Cash Session public_id (ULID)"),
 *   @OA\Property(property="tender_type", type="string", enum={"CASH", "CARD", "TRANSFER"}, example="CASH", description="Payment tender type"),
 *   @OA\Property(property="amount", type="number", format="decimal", example=150.00, description="Expense amount"),
 *   @OA\Property(property="category", type="string", maxLength=100, example="SUPPLIES", description="Expense category (e.g., SUPPLIES, MAINTENANCE, UTILITIES)"),
 *   @OA\Property(property="vendor", type="string", maxLength=255, example="Office Depot", description="Vendor name", nullable=true),
 *   @OA\Property(property="reference", type="string", maxLength=255, example="INV-12345", description="Invoice or receipt reference", nullable=true),
 *   @OA\Property(property="notes", type="string", maxLength=1000, example="Office supplies purchase", description="Additional notes", nullable=true),
 *   @OA\Property(property="card_terminal_id", type="string", example="01JKABC0987654321ZYXWVUTS", description="Cash Terminal public_id (required for CARD)", nullable=true),
 *   @OA\Property(property="bank_account_id", type="string", example="01JKABC0987654321ZYXWVUTS", description="Bank Account public_id (required for TRANSFER)", nullable=true),
 *   @OA\Property(property="incurred_at", type="string", format="date-time", example="2025-12-13T10:30:00Z", description="Expense date/time (defaults to now)", nullable=true),
 *   @OA\Property(property="meta", type="object", example={"receipt_url": "https://..."}, description="Additional metadata", nullable=true),
 * )
 */
class StoreCashExpenseRequest extends FormRequest
{
    use CastsRequestFields;
    use ResolvesPublicIdReferences;
    use SharesValidationMessages;
    use ValidatesTenderTypeReference;

    public function authorize(): bool
    {
        return $this->user()->can('create', CashExpense::class);
    }

    public function rules(): array
    {
        return [
            'cash_session_id' => 'required|string|exists:cash_sessions,public_id',
            'tender_type' => 'required|in:CASH,CARD,TRANSFER',
            'amount' => 'required|numeric|min:0.01|max:999999.99',
            'category' => 'required|string|max:100',
            'vendor' => 'nullable|string|max:255',
            'reference' => 'nullable|string|max:255',
            'notes' => 'nullable|string|max:1000',
            'card_terminal_id' => 'nullable|string|exists:cash_terminals,public_id',
            'bank_account_id' => 'nullable|string|exists:bank_accounts,public_id',
            'incurred_at' => 'nullable|date',
            'meta' => 'nullable|array',
        ];
    }

    public function messages(): array
    {
        return $this->sharedMessages([
            'cash_session_id.required',
            'tender_type.required',
            'tender_type.in',
            'amount.required',
            'amount.min',
            'category.required',
        ]);
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

    public function cashSession(): CashSession
    {
        return $this->resolveModelByPublicId(CashSession::class, 'cash_session_id');
    }

    public function cardTerminalId(): ?int
    {
        return $this->resolvePublicId(CashTerminal::class, 'card_terminal_id');
    }

    public function bankAccountId(): ?int
    {
        return $this->resolvePublicId(BankAccount::class, 'bank_account_id');
    }
}
