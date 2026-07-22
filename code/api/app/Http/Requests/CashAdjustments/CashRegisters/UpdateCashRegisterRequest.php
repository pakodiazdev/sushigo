<?php

namespace App\Http\Requests\CashAdjustments\CashRegisters;

use App\Http\Requests\Concerns\CastsRequestFields;
use Illuminate\Foundation\Http\FormRequest;

/**
 * @OA\Schema(
 *   schema="UpdateCashRegisterRequest",
 *
 *   @OA\Property(property="operating_unit_id", type="integer", example=1, description="Operating Unit ID", nullable=true),
 *   @OA\Property(property="code", type="string", maxLength=50, example="REG-001", description="Register code"),
 *   @OA\Property(property="name", type="string", maxLength=255, example="Caja Principal", description="Register name"),
 *   @OA\Property(property="type", type="string", enum={"ON_PREMISE", "DELIVERY", "EVENT"}, example="ON_PREMISE", description="Register type"),
 *   @OA\Property(property="is_active", type="boolean", example=true, description="Active status"),
 *   @OA\Property(property="meta", type="object", example={"location": "Counter 1"}, description="Additional metadata", nullable=true),
 * )
 */
class UpdateCashRegisterRequest extends FormRequest
{
    use CastsRequestFields;

    public function authorize(): bool
    {
        return $this->user()->can('update', $this->route('cashRegister'));
    }

    public function rules(): array
    {
        $cashRegisterId = $this->route('cashRegister')->id;

        return [
            'operating_unit_id' => 'nullable|integer|exists:operating_units,id',
            'code' => 'sometimes|string|max:50|unique:cash_registers,code,'.$cashRegisterId,
            'name' => 'sometimes|string|max:255',
            'type' => 'sometimes|in:ON_PREMISE,DELIVERY,EVENT',
            'is_active' => 'boolean',
            'meta' => 'nullable|array',
        ];
    }

    public function messages(): array
    {
        return [
            'code.unique' => 'El código ya está en uso',
            'type.in' => 'El tipo debe ser ON_PREMISE, DELIVERY o EVENT',
        ];
    }

    public function prepareForValidation(): void
    {
        $this->castToBoolean('is_active');
    }
}
