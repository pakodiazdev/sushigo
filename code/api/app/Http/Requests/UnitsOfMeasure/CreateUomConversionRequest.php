<?php

namespace App\Http\Requests\UnitsOfMeasure;

use App\Http\Requests\Concerns\ResolvesPublicIdReferences;
use App\Models\UnitOfMeasure;
use App\Models\UomConversion;
use Illuminate\Foundation\Http\FormRequest;

/**
 * @OA\Schema(
 *   schema="CreateUomConversionRequest",
 *   required={"from_uom_id", "to_uom_id", "factor"},
 *
 *   @OA\Property(property="from_uom_id", type="string", example="01JKUOM1234567890ABCDEFGH", description="Source Unit of Measure public_id (ULID)"),
 *   @OA\Property(property="to_uom_id", type="string", example="01JKUOM0987654321ZYXWVUTS", description="Target Unit of Measure public_id (ULID)"),
 *   @OA\Property(property="factor", type="number", format="float", example=1000.0, description="Conversion factor (from * factor = to)"),
 *   @OA\Property(property="tolerance", type="number", format="float", example=0.5, description="Tolerance percentage (default: 0)"),
 *   @OA\Property(property="is_active", type="boolean", example=true, description="Active status (default: true)"),
 * )
 */
class CreateUomConversionRequest extends FormRequest
{
    use ResolvesPublicIdReferences;

    public function authorize(): bool
    {
        return $this->user()->can('units_of_measure.manage');
    }

    public function rules(): array
    {
        return [
            'from_uom_id' => ['required', 'string', 'exists:units_of_measure,public_id'],
            'to_uom_id' => [
                'required',
                'string',
                'exists:units_of_measure,public_id',
                'different:from_uom_id',
                // Rule::unique() compares the column against the raw validated
                // value (the ULID) — it has no way to compare against the
                // resolved numeric FK, so the pair check is a manual closure.
                function ($attribute, $value, $fail): void { // NOSONAR — Laravel calls this closure positionally as (attribute, value, fail); $attribute can't be dropped without shifting $value/$fail out of position
                    // Laravel keeps evaluating other fields' rules after
                    // from_uom_id's own `string` rule fails, so this closure
                    // can still run with a non-string raw value — bail before
                    // it reaches resolvePublicIdValue()'s `?string` parameter.
                    if (! is_string($this->from_uom_id) || ! is_string($value)) {
                        return;
                    }

                    $fromId = $this->resolvePublicIdValue(UnitOfMeasure::class, $this->from_uom_id);
                    $toId = $this->resolvePublicIdValue(UnitOfMeasure::class, $value);

                    if ($fromId && $toId && UomConversion::where('from_uom_id', $fromId)->where('to_uom_id', $toId)->exists()) {
                        $fail('Conversion between these units already exists');
                    }
                },
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
            'factor.gt' => 'Conversion factor must be greater than 0',
        ];
    }

    /**
     * Validated fields ready for UomConversion::create() — from_uom_id/to_uom_id
     * are resolved from public_id (ULID) to the internal numeric FK the
     * database column expects.
     *
     * @return array<string, mixed>
     */
    public function conversionData(): array
    {
        $data = $this->validated();
        $data['from_uom_id'] = $this->resolvePublicId(UnitOfMeasure::class, 'from_uom_id');
        $data['to_uom_id'] = $this->resolvePublicId(UnitOfMeasure::class, 'to_uom_id');
        $data['tolerance'] ??= 0;
        $data['is_active'] ??= true;
        $data['meta'] = [];

        return $data;
    }
}
