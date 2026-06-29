<?php

namespace App\Http\Requests\Attendances;

use Carbon\Carbon;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/**
 * @OA\Schema(
 *   schema="CheckInRequest",
 *   required={"employee_id", "check_in"},
 *
 *   @OA\Property(
 *       property="employee_id",
 *       type="string",
 *       example="01JKXYZ1234567890ABCDEFGH",
 *       description="Employee public_id (ULID)"
 *   ),
 *   @OA\Property(
 *       property="check_in",
 *       type="string",
 *       format="date-time",
 *       example="2026-02-23T09:05:30-06:00",
 *       description="Check-in datetime in ISO 8601 / RFC 3339 with timezone offset. Normalized to UTC by the server."
 *   ),
 *   @OA\Property(
 *       property="reason",
 *       type="string",
 *       example="Corrección retroactiva autorizada por RH",
 *       description="Required when an Admin registers a check-in for a past date."
 *   )
 * )
 */
class CheckInRequest extends FormRequest
{
    public function authorize(): bool
    {
        $checkInInput = $this->input('check_in');
        if (! $checkInInput) {
            return true; // validation will reject it
        }

        $date = Carbon::parse($checkInInput)->toDateString();
        $today = Carbon::today(config('app.business_timezone'))->toDateString();

        $user = $this->user();
        $isAdmin = $user?->hasRole('admin') || $user?->hasRole('super-admin');

        return $isAdmin || $date === $today;
    }

    public function rules(): array
    {
        return [
            'employee_id' => [
                'required',
                'string',
                Rule::exists('employees', 'public_id')->whereNull('deleted_at'),
            ],
            'check_in' => ['required', 'date'],
            'reason' => $this->reasonRules(),
        ];
    }

    public function messages(): array
    {
        return [
            'employee_id.exists' => 'No se encontró el empleado especificado.',
            'check_in.date' => 'El campo check_in debe ser una fecha válida en formato ISO 8601 (ej. 2026-02-23T09:05:30-06:00).',
            'reason.required' => 'Se requiere un motivo para registrar check-in en un día anterior.',
        ];
    }

    private function reasonRules(): array
    {
        $checkInInput = $this->input('check_in');
        if (! $checkInInput) {
            return ['nullable', 'string', 'max:500'];
        }

        $user = $this->user();
        $isAdmin = $user?->hasRole('admin') || $user?->hasRole('super-admin');
        $today = Carbon::today(config('app.business_timezone'))->toDateString();
        $date = Carbon::parse($checkInInput)->toDateString();
        $isPastDay = $date < $today;

        return ($isAdmin && $isPastDay)
            ? ['required', 'string', 'min:5', 'max:500']
            : ['nullable', 'string', 'max:500'];
    }
}
