<?php

namespace App\Http\Requests\Attendances;

use App\Enums\DayStatus;
use App\Support\Clock\ApplicationClock;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/**
 * @OA\Schema(
 *   schema="DayStatusRequest",
 *   required={"employee_id", "date", "day_status"},
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
 *       example="2026-04-12",
 *       description="Date to mark (YYYY-MM-DD)"
 *   ),
 *   @OA\Property(
 *       property="day_status",
 *       type="string",
 *       enum={"ABSENCE"},
 *       example="ABSENCE",
 *       description="Only ABSENCE (unexcused no-show) is accepted. DAY_OFF is auto-managed by CloseDayAction."
 *   ),
 *   @OA\Property(
 *       property="reason",
 *       type="string",
 *       example="Corrección retroactiva",
 *       description="Required when an Admin marks a past-day status."
 *   )
 * )
 */
class DayStatusRequest extends FormRequest
{
    public function __construct(private readonly ApplicationClock $clock)
    {
        parent::__construct();
    }

    public function authorize(): bool
    {
        $date = $this->input('date');
        if (! $date) {
            return true; // validation will reject missing date
        }

        $user = $this->user();
        $isAdmin = $user?->hasRole('admin') || $user?->hasRole('super-admin');
        $today = $this->clock->todayInBusinessTz();

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
            'date' => ['required', 'date_format:Y-m-d'],
            'day_status' => [
                'required',
                Rule::in([DayStatus::ABSENCE->value]),
            ],
            'reason' => $this->reasonRules(),
        ];
    }

    public function messages(): array
    {
        return [
            'employee_id.exists' => 'No se encontró el empleado especificado.',
            'date.date_format' => 'La fecha debe estar en formato YYYY-MM-DD.',
            'day_status.in' => 'Solo se permite el estado ABSENCE. El estado DAY_OFF es asignado automáticamente al cerrar el día.',
            'reason.required' => 'Se requiere un motivo para editar registros de días anteriores.',
        ];
    }

    private function reasonRules(): array
    {
        $date = $this->input('date');
        if (! $date) {
            return ['nullable', 'string', 'max:500'];
        }

        $user = $this->user();
        $isAdmin = $user?->hasRole('admin') || $user?->hasRole('super-admin');
        $today = $this->clock->todayInBusinessTz();
        $isPastDay = $date < $today;

        return ($isAdmin && $isPastDay)
            ? ['required', 'string', 'min:5', 'max:500']
            : ['nullable', 'string', 'max:500'];
    }
}
