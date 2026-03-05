<?php

namespace App\Http\Requests\Schedules;

use App\Enums\WorkdayType;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/**
 * @OA\Schema(
 *   schema="StoreScheduleRequest",
 *   required={"effective_from","workday_type","working_days_per_week","days"},
 *
 *   @OA\Property(property="effective_from", type="string", format="date", example="2026-03-01"),
 *   @OA\Property(property="workday_type", type="string", enum={"FULL","PARTIAL"}, example="FULL"),
 *   @OA\Property(property="working_days_per_week", type="integer", minimum=1, maximum=7, example=5),
 *   @OA\Property(
 *     property="days",
 *     type="array",
 *     minItems=7,
 *     maxItems=7,
 *
 *     @OA\Items(
 *       type="object",
 *       required={"day_of_week","is_day_off"},
 *
 *       @OA\Property(property="day_of_week", type="integer", minimum=1, maximum=7, example=1, description="ISO 8601: 1=Monday … 7=Sunday"),
 *       @OA\Property(property="is_day_off", type="boolean", example=false),
 *       @OA\Property(property="expected_start", type="string", format="time", nullable=true, example="08:00"),
 *       @OA\Property(property="expected_lunch_start", type="string", format="time", nullable=true, example="13:00"),
 *       @OA\Property(property="expected_lunch_end", type="string", format="time", nullable=true, example="14:00"),
 *       @OA\Property(property="lunch_duration_minutes", type="integer", nullable=true, example=60),
 *       @OA\Property(property="expected_end", type="string", format="time", nullable=true, example="17:00")
 *     )
 *   )
 * )
 */
class StoreScheduleRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'effective_from'          => ['required', 'date'],
            'workday_type'            => ['required', 'string', Rule::in(array_column(WorkdayType::cases(), 'value'))],
            'working_days_per_week'   => ['required', 'integer', 'min:1', 'max:7'],

            'days'                    => ['required', 'array', 'size:7'],
            'days.*.day_of_week'      => ['required', 'integer', 'min:1', 'max:7', 'distinct'],
            'days.*.is_day_off'       => ['required', 'boolean'],

            // Time fields: required when the day is NOT marked as day-off
            'days.*.expected_start'   => ['nullable', 'date_format:H:i', Rule::requiredIf(fn () => false)],
            'days.*.expected_lunch_start' => ['nullable', 'date_format:H:i'],
            'days.*.expected_lunch_end'   => ['nullable', 'date_format:H:i'],
            'days.*.lunch_duration_minutes' => ['nullable', 'integer', 'min:1', 'max:480'],
            'days.*.expected_end'     => ['nullable', 'date_format:H:i'],
        ];
    }

    public function withValidator($validator): void
    {
        $validator->after(function ($v) {
            $days = $this->input('days', []);

            foreach ($days as $index => $day) {
                $isDayOff = filter_var($day['is_day_off'] ?? false, FILTER_VALIDATE_BOOLEAN);

                if (! $isDayOff) {
                    if (empty($day['expected_start'])) {
                        $v->errors()->add(
                            "days.{$index}.expected_start",
                            'El horario de entrada es requerido para días laborales.'
                        );
                    }
                    if (empty($day['expected_end'])) {
                        $v->errors()->add(
                            "days.{$index}.expected_end",
                            'El horario de salida es requerido para días laborales.'
                        );
                    }
                }
            }
        });
    }

    public function messages(): array
    {
        return [
            'days.size'               => 'Se requieren exactamente 7 días (uno por cada día de la semana).',
            'days.*.day_of_week.distinct' => 'No puede haber días duplicados.',
            'days.*.day_of_week.min'  => 'El día de la semana debe ser entre 1 (lunes) y 7 (domingo).',
            'days.*.day_of_week.max'  => 'El día de la semana debe ser entre 1 (lunes) y 7 (domingo).',
            'days.*.expected_start.date_format' => 'El horario de entrada debe tener formato HH:MM (ej. 08:00).',
            'days.*.expected_end.date_format'   => 'El horario de salida debe tener formato HH:MM (ej. 17:00).',
        ];
    }
}
