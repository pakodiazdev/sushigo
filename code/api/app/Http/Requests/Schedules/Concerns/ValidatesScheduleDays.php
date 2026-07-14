<?php

namespace App\Http\Requests\Schedules\Concerns;

use App\Enums\WorkdayType;
use Illuminate\Validation\Rule;

/**
 * Shared validation for the 7-day schedule payload, used by both
 * StoreScheduleRequest (create) and UpdateScheduleRequest (edit in place).
 */
trait ValidatesScheduleDays
{
    protected function scheduleDayRules(): array
    {
        return [
            'effective_from' => ['required', 'date'],
            'workday_type' => ['required', 'string', Rule::in(array_column(WorkdayType::cases(), 'value'))],
            'working_days_per_week' => ['required', 'integer', 'min:1', 'max:7'],

            'days' => ['required', 'array', 'size:7'],
            'days.*.day_of_week' => ['required', 'integer', 'min:1', 'max:7', 'distinct'],
            'days.*.is_day_off' => ['required', 'boolean'],

            // Time fields: required when the day is NOT marked as day-off (enforced via withValidator)
            'days.*.expected_start' => ['nullable', 'date_format:H:i'],
            'days.*.expected_lunch_start' => ['nullable', 'date_format:H:i'],
            'days.*.expected_lunch_end' => ['nullable', 'date_format:H:i'],
            'days.*.lunch_duration_minutes' => ['nullable', 'integer', 'min:1', 'max:480'],
            'days.*.expected_end' => ['nullable', 'date_format:H:i'],
        ];
    }

    protected function validateWorkingDayFields($validator, array $days): void
    {
        foreach ($days as $index => $day) {
            $isDayOff = filter_var($day['is_day_off'] ?? false, FILTER_VALIDATE_BOOLEAN);

            if ($isDayOff) {
                continue;
            }

            if (empty($day['expected_start'])) {
                $validator->errors()->add(
                    "days.{$index}.expected_start",
                    'El horario de entrada es requerido para días laborales.'
                );
            }

            if (empty($day['expected_end'])) {
                $validator->errors()->add(
                    "days.{$index}.expected_end",
                    'El horario de salida es requerido para días laborales.'
                );
            }
        }
    }

    protected function scheduleDayMessages(): array
    {
        return [
            'days.size' => 'Se requieren exactamente 7 días (uno por cada día de la semana).',
            'days.*.day_of_week.distinct' => 'No puede haber días duplicados.',
            'days.*.day_of_week.min' => 'El día de la semana debe ser entre 1 (lunes) y 7 (domingo).',
            'days.*.day_of_week.max' => 'El día de la semana debe ser entre 1 (lunes) y 7 (domingo).',
            'days.*.expected_start.date_format' => 'El horario de entrada debe tener formato HH:MM (ej. 08:00).',
            'days.*.expected_end.date_format' => 'El horario de salida debe tener formato HH:MM (ej. 17:00).',
        ];
    }
}
