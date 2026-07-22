<?php

namespace App\Http\Requests\CashAdjustments\CashRegisters;

use App\Http\Requests\Concerns\CastsRequestFields;
use Illuminate\Foundation\Http\FormRequest;

/**
 * @OA\Schema(
 *   schema="StoreCashRegisterRequest",
 *   required={"branch_id", "code", "name", "type"},
 *
 *   @OA\Property(property="branch_id", type="integer", example=1, description="Branch ID"),
 *   @OA\Property(property="operating_unit_id", type="integer", example=1, description="Operating Unit ID (for events)", nullable=true),
 *   @OA\Property(property="code", type="string", maxLength=50, example="REG-001", description="Unique register code"),
 *   @OA\Property(property="name", type="string", maxLength=255, example="Caja Principal", description="Register name"),
 *   @OA\Property(property="type", type="string", enum={"ON_PREMISE", "DELIVERY", "EVENT"}, example="ON_PREMISE", description="Register type"),
 *   @OA\Property(property="is_active", type="boolean", example=true, description="Active status (default: true)"),
 *   @OA\Property(property="meta", type="object", example={"location": "Counter 1"}, description="Additional metadata", nullable=true),
 * )
 */
class StoreCashRegisterRequest extends FormRequest
{
    use CastsRequestFields;

    public function authorize(): bool
    {
        return $this->user()->can('create', \App\Models\CashRegister::class);
    }

    public function rules(): array
    {
        return [
            'branch_id' => 'required|integer|exists:branches,id',
            'operating_unit_id' => 'nullable|integer|exists:operating_units,id',
            'code' => 'required|string|max:50|unique:cash_registers,code',
            'name' => 'required|string|max:255',
            'type' => 'required|in:ON_PREMISE,DELIVERY,EVENT',
            'is_active' => 'boolean',
            'meta' => 'nullable|array',
        ];
    }

    public function messages(): array
    {
        return [
            'branch_id.required' => 'La sucursal es requerida',
            'branch_id.exists' => 'La sucursal no existe',
            'code.required' => 'El código es requerido',
            'code.unique' => 'El código ya está en uso',
            'name.required' => 'El nombre es requerido',
            'type.required' => 'El tipo es requerido',
            'type.in' => 'El tipo debe ser ON_PREMISE, DELIVERY o EVENT',
        ];
    }

    public function prepareForValidation(): void
    {
        $this->castToBoolean('is_active');
    }
}
