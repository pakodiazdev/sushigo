<?php

namespace App\Http\Requests\CashAdjustments\BankAccounts;

use App\Http\Requests\Concerns\CastsRequestFields;
use Illuminate\Foundation\Http\FormRequest;

/**
 * @OA\Schema(
 *   schema="StoreBankAccountRequest",
 *   required={"branch_id", "alias", "bank_name", "account_number_masked"},
 *
 *   @OA\Property(property="branch_id", type="integer", example=1, description="Branch ID"),
 *   @OA\Property(property="alias", type="string", maxLength=255, example="Cuenta BBVA Principal", description="Account alias"),
 *   @OA\Property(property="bank_name", type="string", maxLength=255, example="BBVA", description="Bank name"),
 *   @OA\Property(property="account_number_masked", type="string", maxLength=50, example="****1234", description="Masked account number"),
 *   @OA\Property(property="clabe_masked", type="string", maxLength=22, example="012345************", description="Masked CLABE", nullable=true),
 *   @OA\Property(property="is_active", type="boolean", example=true, description="Active status (default: true)"),
 *   @OA\Property(property="meta", type="object", example={"currency": "MXN"}, description="Additional metadata", nullable=true),
 * )
 */
class StoreBankAccountRequest extends FormRequest
{
    use CastsRequestFields;

    public function authorize(): bool
    {
        return $this->user()->can('create', \App\Models\BankAccount::class);
    }

    public function rules(): array
    {
        return [
            'branch_id' => 'required|integer|exists:branches,id',
            'alias' => 'required|string|max:255',
            'bank_name' => 'required|string|max:255',
            'account_number_masked' => 'required|string|max:50',
            'clabe_masked' => 'nullable|string|max:22',
            'is_active' => 'boolean',
            'meta' => 'nullable|array',
        ];
    }

    public function messages(): array
    {
        return [
            'branch_id.required' => 'La sucursal es requerida',
            'alias.required' => 'El alias es requerido',
            'bank_name.required' => 'El nombre del banco es requerido',
            'account_number_masked.required' => 'El número de cuenta enmascarado es requerido',
        ];
    }

    public function prepareForValidation(): void
    {
        $this->castToBoolean('is_active');
    }
}
