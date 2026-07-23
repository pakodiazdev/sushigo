<?php

namespace App\Http\Requests\CashAdjustments\CashTerminals;

use App\Http\Requests\Concerns\CastsRequestFields;
use App\Models\CashTerminal;
use Illuminate\Foundation\Http\FormRequest;

/**
 * @OA\Schema(
 *   schema="StoreCashTerminalRequest",
 *   required={"branch_id", "name", "provider"},
 *
 *   @OA\Property(property="branch_id", type="integer", example=1, description="Branch ID"),
 *   @OA\Property(property="name", type="string", maxLength=255, example="Terminal CLIP 1", description="Terminal name"),
 *   @OA\Property(property="provider", type="string", maxLength=100, example="CLIP", description="Payment provider (e.g., CLIP, MERCADOPAGO)"),
 *   @OA\Property(property="account_ref", type="string", maxLength=255, example="ACC-12345", description="Provider account reference", nullable=true),
 *   @OA\Property(property="last_four", type="string", pattern="^[0-9]{4}$", example="1234", description="Last 4 digits of terminal ID", nullable=true),
 *   @OA\Property(property="is_active", type="boolean", example=true, description="Active status (default: true)"),
 *   @OA\Property(property="meta", type="object", example={"serial": "SN123"}, description="Additional metadata", nullable=true),
 * )
 */
class StoreCashTerminalRequest extends FormRequest
{
    use CastsRequestFields;

    public function authorize(): bool
    {
        return $this->user()->can('create', CashTerminal::class);
    }

    public function rules(): array
    {
        return [
            'branch_id' => 'required|integer|exists:branches,id',
            'name' => 'required|string|max:255',
            'provider' => 'required|string|max:100',
            'account_ref' => 'nullable|string|max:255',
            'last_four' => 'nullable|string|size:4|regex:/^[0-9]{4}$/',
            'is_active' => 'boolean',
            'meta' => 'nullable|array',
        ];
    }

    public function messages(): array
    {
        return [
            'branch_id.required' => 'La sucursal es requerida',
            'name.required' => 'El nombre es requerido',
            'provider.required' => 'El proveedor es requerido',
            'last_four.size' => 'Deben ser exactamente 4 dígitos',
            'last_four.regex' => 'Solo se permiten números',
        ];
    }

    public function prepareForValidation(): void
    {
        $this->castToBoolean('is_active');
    }
}
