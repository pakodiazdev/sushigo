<?php

namespace App\Http\Requests\UnitsOfMeasure;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/**
 * @OA\Schema(
 *   schema="CreateUomConversionRequest",
 *   required={"from_uom_id", "to_uom_id", "factor"},
 *   @OA\Property(property="from_uom_id", type="integer", example=1, description="Source UOM ID"),
 *   @OA\Property(property="to_uom_id", type="integer", example=2, description="Target UOM ID"),
 *   @OA\Property(property="factor", type="number", format="float", example=1000.0, description="Conversion factor (from * factor = to)"),
 *   @OA\Property(property="tolerance", type="number", format="float", example=0.5, description="Tolerance percentage (default: 0)"),
 *   @OA\Property(property="is_active", type="boolean", example=true, description="Active status (default: true)"),
 * )
 */
class CreateUomConversionRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->can('create', \App\Models\UomConversion::class);
    }

    public function rules(): array
    {
        return [
            'from_uom_id' => ['required', 'integer', 'exists:units_of_measure,id'],
            'to_uom_id' => [
                'required',
                'integer',
                'exists:units_of_measure,id',
                'different:from_uom_id',
                Rule::unique('uom_conversions')->where(function ($query) {
                    return $query->where('from_uom_id', $this->from_uom_id)
                        ->where('to_uom_id', $this->to_uom_id);
                }),
            ],
            'factor' => ['required', 'numeric', 'gt:0'],
            'tolerance' => ['nullable', 'numeric', 'min:0', 'max:100'],
            'is_active' => ['nullable', 'boolean'],
        ];
    }

    public function messages(): array
    {
        return [
            'to_uom_id.different' => 'Target UOM must be different from source UOM',
            'to_uom_id.unique' => 'Conversion between these units already exists',
            'factor.gt' => 'Conversion factor must be greater than 0',
        ];
    }
}
