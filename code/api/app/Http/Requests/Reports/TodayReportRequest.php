<?php

namespace App\Http\Requests\Reports;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/**
 * Validate query parameters for the today operational report.
 *
 * @OA\Schema(
 *   schema="TodayReportRequest",
 *   required={"branch_id"},
 *
 *   @OA\Property(
 *       property="branch_id",
 *       type="integer",
 *       example=1,
 *       description="Branch ID (query param). Returns only active employees assigned to this branch."
 *   )
 * )
 */
class TodayReportRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'branch_id' => ['required', 'integer', Rule::exists('branches', 'id')->whereNull('deleted_at')],
        ];
    }

    public function messages(): array
    {
        return [
            'branch_id.required' => 'El branch_id es requerido.',
            'branch_id.integer' => 'El branch_id debe ser un número entero.',
            'branch_id.exists' => 'La sucursal indicada no existe.',
        ];
    }
}
