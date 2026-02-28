<?php

namespace App\Http\Requests\CashAdjustments\BankAccounts;

use Illuminate\Foundation\Http\FormRequest;

/**
 * @OA\Schema(
 *   schema="UpdateBankAccountRequest",
 *
 *   @OA\Property(property="alias", type="string", maxLength=255, example="Cuenta BBVA Principal", description="Account alias"),
 *   @OA\Property(property="bank_name", type="string", maxLength=255, example="BBVA", description="Bank name"),
 *   @OA\Property(property="account_number_masked", type="string", maxLength=50, example="****1234", description="Masked account number"),
 *   @OA\Property(property="clabe_masked", type="string", maxLength=22, example="012345************", description="Masked CLABE", nullable=true),
 *   @OA\Property(property="is_active", type="boolean", example=true, description="Active status"),
 *   @OA\Property(property="meta", type="object", example={"currency": "MXN"}, description="Additional metadata", nullable=true),
 * )
 */
class UpdateBankAccountRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->can('update', $this->route('bankAccount'));
    }

    public function rules(): array
    {
        return [
            'alias' => 'sometimes|string|max:255',
            'bank_name' => 'sometimes|string|max:255',
            'account_number_masked' => 'sometimes|string|max:50',
            'clabe_masked' => 'nullable|string|max:22',
            'is_active' => 'boolean',
            'meta' => 'nullable|array',
        ];
    }

    public function prepareForValidation(): void
    {
        if ($this->has('is_active') && is_string($this->is_active)) {
            $this->merge([
                'is_active' => filter_var($this->is_active, FILTER_VALIDATE_BOOLEAN),
            ]);
        }
    }
}
