<?php

namespace App\Http\Requests\Attendances;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/**
 * Validate query parameters for the daily attendance view.
 *
 * @OA\Schema(
 *   schema="TodayAttendanceRequest",
 *   required={"branch_id"},
 *
 *   @OA\Property(
 *       property="branch_id",
 *       type="integer",
 *       example=1,
 *       description="Branch ID (query param). Returns only active employees assigned to this branch."
 *   ),
 *   @OA\Property(
 *       property="date",
 *       type="string",
 *       format="date",
 *       example="2026-06-24",
 *       description="Date to view (YYYY-MM-DD). Defaults to today in the business timezone when omitted."
 *   )
 * )
 */
class TodayAttendanceRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'branch_id' => ['required', 'integer', Rule::exists('branches', 'id')->whereNull('deleted_at')],
            'date' => ['nullable', 'date_format:Y-m-d'],
        ];
    }

    public function messages(): array
    {
        return [
            'branch_id.required' => 'El branch_id es requerido.',
            'branch_id.integer' => 'El branch_id debe ser un número entero.',
            'branch_id.exists' => 'La sucursal indicada no existe.',
            'date.date_format' => 'La fecha debe estar en formato YYYY-MM-DD.',
        ];
    }
}
