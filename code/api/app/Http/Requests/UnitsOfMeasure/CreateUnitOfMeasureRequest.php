<?php

namespace App\Http\Requests\UnitsOfMeasure;

use Illuminate\Foundation\Http\FormRequest;

/**
 * @OA\Schema(
 *   schema="CreateUnitOfMeasureRequest",
 *   required={"code", "name", "symbol"},
 *   @OA\Property(property="code", type="string", maxLength=20, example="KG", description="Unique UOM code"),
 *   @OA\Property(property="name", type="string", maxLength=100, example="Kilogramo", description="UOM display name"),
 *   @OA\Property(property="symbol", type="string", maxLength=10, example="kg", description="UOM symbol"),
 *   @OA\Property(property="precision", type="integer", example=3, description="Decimal precision (default: 2)"),
 *   @OA\Property(property="is_decimal", type="boolean", example=true, description="Whether UOM supports decimals (default: true)"),
 *   @OA\Property(property="is_active", type="boolean", example=true, description="Active status (default: true)"),
 * )
 */
class CreateUnitOfMeasureRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->can('create', \App\Models\UnitOfMeasure::class);
    }

    public function rules(): array
    {
        return [
            'code' => ['required', 'string', 'max:20', 'unique:units_of_measure,code'],
            'name' => ['required', 'string', 'max:100'],
            'symbol' => ['required', 'string', 'max:10'],
            'precision' => ['nullable', 'integer', 'min:0', 'max:6'],
            'is_decimal' => ['nullable', 'boolean'],
            'is_active' => ['nullable', 'boolean'],
        ];
    }

    public function prepareForValidation(): void
    {
        $this->merge([
            'code' => strtoupper($this->code ?? ''),
        ]);
    }
}
