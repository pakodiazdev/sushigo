<?php

namespace App\Http\Requests\VacationRequests;

use App\Models\Employee;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/**
 * @OA\Schema(
 *   schema="RegisterVacationRequestRequest",
 *   required={"employee_id", "dates"},
 *
 *   @OA\Property(property="employee_id", type="string", example="01JKABC0987654321ZYXWVUTS", description="Employee public_id (ULID)"),
 *   @OA\Property(property="dates", type="array", @OA\Items(type="string", format="date"), example={"2026-08-01", "2026-08-05"}, description="Individual selected days, do not need to be contiguous"),
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
            'dates' => ['required', 'array', 'min:1'],
            'dates.*' => ['required', 'date', 'distinct'],
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
