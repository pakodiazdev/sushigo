<?php

namespace App\Http\Requests\NegotiatedExtraDay;

use App\Http\Requests\Concerns\GuardsClosedPayPeriod;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

/**
 * @OA\Schema(
 *   schema="StoreNegotiatedExtraDayRequest",
 *   required={"employee_id", "date", "agreed_daily_wage", "prima_percent"},
 *
 *   @OA\Property(
 *       property="employee_id",
 *       type="string",
 *       example="01JKXYZ1234567890ABCDEFGH",
 *       description="Employee public_id (ULID)"
 *   ),
 *   @OA\Property(
 *       property="date",
 *       type="string",
 *       format="date",
 *       example="2026-04-20",
 *       description="Date of the extra day"
 *   ),
 *   @OA\Property(
 *       property="agreed_daily_wage",
 *       type="number",
 *       format="float",
 *       example=500.00,
 *       description="Negotiated daily wage for the extra day"
 *   ),
 *   @OA\Property(
 *       property="prima_percent",
 *       type="number",
 *       format="float",
 *       example=100.00,
 *       description="Prima percentage (0 to 200)"
 *   ),
 *   @OA\Property(
 *       property="notes",
 *       type="string",
 *       nullable=true,
 *       example="Acuerdo especial para cubrir turno",
 *       description="Optional notes about the negotiation"
 *   )
 * )
 */
class StoreNegotiatedExtraDayRequest extends FormRequest
{
    use GuardsClosedPayPeriod;

    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'employee_id' => [
                'required',
                'string',
                Rule::exists('employees', 'public_id')->whereNull('deleted_at'),
            ],
            'date' => ['required', 'date'],
            'agreed_daily_wage' => ['required', 'numeric', 'min:0'],
            'prima_percent' => ['required', 'numeric', 'min:0', 'max:200'],
            'notes' => ['nullable', 'string', 'max:500'],
        ];
    }

    public function messages(): array
    {
        return [
            'employee_id.exists' => 'No se encontró el empleado especificado.',
            'date.date' => 'La fecha debe ser una fecha válida.',
            'agreed_daily_wage.min' => 'El salario diario acordado no puede ser negativo.',
            'prima_percent.min' => 'El porcentaje de prima no puede ser negativo.',
            'prima_percent.max' => 'El porcentaje de prima no puede ser mayor a 200.',
        ];
    }

    public function withValidator(Validator $validator): void
    {
        $date = $this->input('date');
        if (! $date) {
            return;
        }

        $employeeId = $this->employeeIdFromPublicId($this->input('employee_id'));

        $this->guardClosedPeriod($validator, $employeeId, $date);
    }
}
