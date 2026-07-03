<?php

namespace App\Http\Requests\VacationRequests;

use App\Models\Employee;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/**
 * @OA\Schema(
 *   schema="RegisterVacationRequestRequest",
 *   required={"employee_id", "start_date", "end_date"},
 *
 *   @OA\Property(property="employee_id", type="string", example="01JKABC0987654321ZYXWVUTS", description="Employee public_id (ULID)"),
 *   @OA\Property(property="start_date", type="string", format="date", example="2026-08-01"),
 *   @OA\Property(property="end_date", type="string", format="date", example="2026-08-05", description="Must be >= start_date"),
 *   @OA\Property(property="notes", type="string", nullable=true, maxLength=1000, example="Vacaciones familiares")
 * )
 */
class RegisterVacationRequestRequest extends FormRequest
{
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
            'start_date' => ['required', 'date'],
            'end_date' => ['required', 'date', 'after_or_equal:start_date'],
            'notes' => ['nullable', 'string', 'max:1000'],
        ];
    }

    /**
     * Resolve the Employee model from the public_id in the request.
     */
    public function employee(): Employee
    {
        return Employee::where('public_id', $this->input('employee_id'))->firstOrFail();
    }
}
