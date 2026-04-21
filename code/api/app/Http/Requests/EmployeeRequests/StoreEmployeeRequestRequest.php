<?php

namespace App\Http\Requests\EmployeeRequests;

use App\Enums\EmployeeRequestType;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

/**
 * @OA\Schema(
 *   schema="StoreEmployeeRequestRequest",
 *   required={"employee_id", "type", "payload"},
 *
 *   @OA\Property(property="employee_id", type="string", example="01JKABC0987654321ZYXWVUTS", description="Employee public_id (ULID)"),
 *   @OA\Property(property="type", type="string", enum={"EXTRA_DAY", "LEAVE", "VACATION", "SCHEDULE_CHANGE"}, example="EXTRA_DAY"),
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
 *      @OA\Property(property="branch_id", type="integer", nullable=true, example=1)
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
            'type' => ['required', Rule::in(array_map(fn (EmployeeRequestType $t) => $t->value, EmployeeRequestType::cases()))],
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
        ];
    }

    public function withValidator(Validator $validator): void
    {
        $validator->after(function (Validator $v) {
            if ($this->input('type') !== EmployeeRequestType::EXTRA_DAY->value) {
                return;
            }

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
                if (! array_key_exists($field, (array) $this->input('payload'))) {
                    $v->errors()->add("payload.{$field}", "El campo payload.{$field} es requerido para solicitudes EXTRA_DAY.");
                }
            }
        });
    }
}
