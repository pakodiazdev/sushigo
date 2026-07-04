<?php

namespace App\Http\Requests\EmployeeRequests;

use App\Enums\EmployeeRequestType;
use App\Enums\LeaveCalculationMode;
use App\Enums\LeaveTimeMode;
use App\Models\LeaveType;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

/**
 * @OA\Schema(
 *   schema="StoreEmployeeRequestRequest",
 *   required={"employee_id", "type", "payload"},
 *
 *   @OA\Property(property="employee_id", type="string", example="01JKABC0987654321ZYXWVUTS", description="Employee public_id (ULID)"),
 *   @OA\Property(property="type", type="string", enum={"EXTRA_DAY", "LEAVE"}, example="EXTRA_DAY"),
 *   @OA\Property(property="auto_approve", type="boolean", example=false),
 *   @OA\Property(property="notes", type="string", nullable=true, maxLength=1000, example="Solicitud registrada por gerente"),
 *   @OA\Property(
 *      property="payload",
 *      type="object",
 *      @OA\Property(property="date", type="string", format="date", example="2026-04-22"),
 *      @OA\Property(property="salary_pct", type="number", format="float", example=100),
 *      @OA\Property(property="prima_pct", type="number", format="float", example=100),
 *      @OA\Property(property="salary_day", type="number", format="float", example=200.00),
 *      @OA\Property(property="prima", type="number", format="float", example=200.00),
 *      @OA\Property(property="seventh_day", type="number", format="float", example=200.00),
 *      @OA\Property(property="total", type="number", format="float", example=600.00),
 *      @OA\Property(property="branch_id", type="integer", nullable=true, example=1),
 *      @OA\Property(property="leave_type_id", type="integer", example=1, description="Required for type=LEAVE"),
 *      @OA\Property(property="dates", type="array", @OA\Items(type="string", format="date"), example={"2026-04-22", "2026-04-24"}, description="Required for type=LEAVE — the individual days requested, not required to be contiguous"),
 *      @OA\Property(property="pay_percentage", type="number", nullable=true, example=100),
 *      @OA\Property(property="rest_day_factor", type="string", nullable=true, enum={"FULL", "PROPORTIONAL", "NONE"}),
 *      @OA\Property(property="time_mode", type="string", nullable=true, enum={"SCHEDULED", "OPEN_ENDED"}, description="Required for PROPORTIONAL_HOURS leave types"),
 *      @OA\Property(property="scheduled_start_time", type="string", nullable=true, example="14:00"),
 *      @OA\Property(property="scheduled_end_time", type="string", nullable=true, example="16:00", description="Required when time_mode is SCHEDULED")
 *   )
 * )
 */
class StoreEmployeeRequestRequest extends FormRequest
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
            'type' => ['required', Rule::in([EmployeeRequestType::EXTRA_DAY->value, EmployeeRequestType::LEAVE->value])],
            'auto_approve' => ['nullable', 'boolean'],
            'notes' => ['nullable', 'string', 'max:1000'],
            'payload' => ['required', 'array'],
            'payload.date' => ['nullable', 'date'],
            'payload.salary_pct' => ['nullable', 'numeric', 'min:0', 'max:200'],
            'payload.prima_pct' => ['nullable', 'numeric', 'min:0', 'max:200'],
            'payload.salary_day' => ['nullable', 'numeric', 'min:0'],
            'payload.prima' => ['nullable', 'numeric', 'min:0'],
            'payload.seventh_day' => ['nullable', 'numeric', 'min:0'],
            'payload.total' => ['nullable', 'numeric', 'min:0'],
            'payload.branch_id' => ['nullable', 'integer', 'exists:branches,id'],
            'payload.leave_type_id' => ['nullable', 'integer', Rule::exists('leave_types', 'id')->where('is_active', true)],
            'payload.dates' => ['nullable', 'array', 'min:1'],
            'payload.dates.*' => ['required', 'date', 'distinct'],
            'payload.pay_percentage' => ['nullable', 'numeric', 'min:0', 'max:100'],
            'payload.rest_day_factor' => ['nullable', Rule::in(['FULL', 'PROPORTIONAL', 'NONE'])],
            'payload.time_mode' => ['nullable', Rule::in([LeaveTimeMode::SCHEDULED->value, LeaveTimeMode::OPEN_ENDED->value])],
            'payload.scheduled_start_time' => ['nullable', 'date_format:H:i', 'required_with:payload.time_mode'],
            'payload.scheduled_end_time' => ['nullable', 'date_format:H:i', 'after:payload.scheduled_start_time'],
        ];
    }

    public function withValidator(Validator $validator): void
    {
        $validator->after(function (Validator $v) {
            if ($this->input('type') === EmployeeRequestType::EXTRA_DAY->value) {
                $this->validateExtraDayPayload($v);
            }

            if ($this->input('type') === EmployeeRequestType::LEAVE->value) {
                $this->validateLeavePayload($v);
            }
        });
    }

    private function validateExtraDayPayload(Validator $v): void
    {
        $requiredFields = [
            'date',
            'salary_pct',
            'prima_pct',
            'salary_day',
            'prima',
            'seventh_day',
            'total',
        ];

        foreach ($requiredFields as $field) {
            $value = data_get($this->input('payload'), $field);
            if ($value === null || $value === '') {
                $v->errors()->add("payload.{$field}", "El campo payload.{$field} es requerido para solicitudes EXTRA_DAY.");
            }
        }
    }

    private function validateLeavePayload(Validator $v): void
    {
        $payload = (array) $this->input('payload');

        if (! data_get($payload, 'leave_type_id')) {
            $v->errors()->add('payload.leave_type_id', 'El campo payload.leave_type_id es requerido para solicitudes LEAVE.');
        }

        if (empty($payload['dates'])) {
            $v->errors()->add('payload.dates', 'El campo payload.dates es requerido para solicitudes LEAVE.');
        }

        $leaveType = LeaveType::find($payload['leave_type_id'] ?? null);

        if (! $leaveType) {
            return;
        }

        if ($leaveType->calculation_mode === LeaveCalculationMode::PROPORTIONAL_HOURS) {
            if (! data_get($payload, 'time_mode')) {
                $v->errors()->add('payload.time_mode', 'El modo de horario es requerido para permisos por horas.');
            }

            if (is_array($payload['dates'] ?? null) && count($payload['dates']) > 1) {
                $v->errors()->add('payload.dates', 'Los permisos por horas deben ser de un solo día.');
            }
        }

        if (
            data_get($payload, 'time_mode') === LeaveTimeMode::SCHEDULED->value
            && ! data_get($payload, 'scheduled_end_time')
        ) {
            $v->errors()->add('payload.scheduled_end_time', 'La hora de fin es requerida cuando el horario es definido.');
        }
    }
}
