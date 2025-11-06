<?php

namespace App\Http\Requests\UnitsOfMeasure;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/**
 * @OA\Schema(
 *   schema="UpdateUnitOfMeasureRequest",
 *   @OA\Property(property="name", type="string", maxLength=100, example="Kilogramo", description="UOM display name"),
 *   @OA\Property(property="symbol", type="string", maxLength=10, example="kg", description="UOM symbol"),
 *   @OA\Property(property="precision", type="integer", example=3, description="Decimal precision"),
 *   @OA\Property(property="is_decimal", type="boolean", example=true, description="Whether UOM supports decimals"),
 *   @OA\Property(property="is_active", type="boolean", example=true, description="Active status"),
 * )
 */
class UpdateUnitOfMeasureRequest extends FormRequest
{
    public function authorize(): bool
    {
        $uom = $this->route('id');
        return $this->user()->can('update', $uom);
    }

    public function rules(): array
    {
        return [
            'name' => ['sometimes', 'string', 'max:100'],
            'symbol' => ['sometimes', 'string', 'max:10'],
            'precision' => ['sometimes', 'integer', 'min:0', 'max:6'],
            'is_decimal' => ['sometimes', 'boolean'],
            'is_active' => ['sometimes', 'boolean'],
        ];
    }
}
