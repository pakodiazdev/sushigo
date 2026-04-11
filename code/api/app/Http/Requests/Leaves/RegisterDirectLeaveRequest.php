<?php

namespace App\Http\Requests\Leaves;

use App\Enums\LeaveCalculationMode;
use App\Enums\LeaveTimeMode;
use App\Models\Employee;
use App\Models\LeaveType;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

/**
 * @OA\Schema(
 *   schema="RegisterDirectLeaveRequest",
 *   required={"employee_id", "leave_type_id", "start_date", "end_date"},
 *
 *   @OA\Property(property="employee_id", type="string", example="01JKABC0987654321ZYXWVUTS", description="Employee public_id (ULID)"),
 *   @OA\Property(property="leave_type_id", type="integer", example=1, description="Active leave type ID"),
 *   @OA\Property(property="start_date", type="string", format="date", example="2026-03-01"),
 *   @OA\Property(property="end_date", type="string", format="date", example="2026-03-03", description="Must be >= start_date"),
 *   @OA\Property(property="pay_percentage", type="number", nullable=true, example=100, description="Override pay percentage (0-100)"),
 *   @OA\Property(property="rest_day_factor", type="string", nullable=true, enum={"FULL", "PROPORTIONAL", "NONE"}, description="Override rest day factor"),
 *   @OA\Property(property="time_mode", type="string", nullable=true, enum={"SCHEDULED", "OPEN_ENDED"}, description="Required for PROPORTIONAL_HOURS leave types"),
 *   @OA\Property(property="scheduled_start_time", type="string", nullable=true, example="09:00", description="Format H:i, required with time_mode"),
 *   @OA\Property(property="scheduled_end_time", type="string", nullable=true, example="13:00", description="Format H:i, required when time_mode is SCHEDULED"),
 *   @OA\Property(property="actual_start_time", type="string", nullable=true, example="09:05", description="Format H:i"),
 *   @OA\Property(property="actual_end_time", type="string", nullable=true, example="12:55", description="Format H:i"),
 *   @OA\Property(property="notes", type="string", nullable=true, maxLength=1000, example="Cita médica", description="Optional notes")
 * )
 */
class RegisterDirectLeaveRequest extends FormRequest
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
            'leave_type_id' => ['required', 'integer', Rule::exists('leave_types', 'id')->where('is_active', true)],
            'start_date' => ['required', 'date'],
            'end_date' => ['required', 'date', 'gte:start_date'],
            'pay_percentage' => ['nullable', 'numeric', 'min:0', 'max:100'],
            'rest_day_factor' => ['nullable', Rule::in(['FULL', 'PROPORTIONAL', 'NONE'])],
            'time_mode' => ['nullable', Rule::in([LeaveTimeMode::SCHEDULED->value, LeaveTimeMode::OPEN_ENDED->value])],
            'scheduled_start_time' => ['nullable', 'date_format:H:i', 'required_with:time_mode'],
            'scheduled_end_time' => ['nullable', 'date_format:H:i', 'after:scheduled_start_time'],
            'actual_start_time' => ['nullable', 'date_format:H:i'],
            'actual_end_time' => ['nullable', 'date_format:H:i', 'after:actual_start_time'],
            'notes' => ['nullable', 'string', 'max:1000'],
        ];
    }

    public function withValidator(Validator $validator): void
    {
        $validator->after(function (Validator $v) {
            $leaveType = LeaveType::find($this->input('leave_type_id'));

            if (! $leaveType) {
                return;
            }

            if ($leaveType->calculation_mode === LeaveCalculationMode::PROPORTIONAL_HOURS) {
                if (! $this->input('time_mode')) {
                    $v->errors()->add('time_mode', 'El modo de horario es requerido para permisos por horas.');
                }

                if (
                    $this->input('start_date') && $this->input('end_date')
                    && $this->input('start_date') !== $this->input('end_date')
                ) {
                    $v->errors()->add('end_date', 'Los permisos por horas deben ser de un solo día.');
                }
            }

            if (
                $this->input('time_mode') === LeaveTimeMode::SCHEDULED->value
                && ! $this->input('scheduled_end_time')
            ) {
                $v->errors()->add('scheduled_end_time', 'La hora de fin es requerida cuando el horario es definido.');
            }
        });
    }

    /**
     * Resolve the Employee model from the public_id in the request.
     */
    public function employee(): Employee
    {
        return Employee::where('public_id', $this->input('employee_id'))->firstOrFail();
    }
}
