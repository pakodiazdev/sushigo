<?php

namespace App\Http\Requests\Schedules;

use Illuminate\Foundation\Http\FormRequest;

/**
 * @OA\Schema(
 *   schema="StoreScheduleDayOverrideRequest",
 *   required={"day_of_week","effective_from","is_day_off"},
 *
 *   @OA\Property(property="day_of_week", type="integer", minimum=1, maximum=7, example=1, description="ISO 8601: 1=Monday … 7=Sunday"),
 *   @OA\Property(property="effective_from", type="string", format="date", example="2026-03-10"),
 *   @OA\Property(property="effective_to", type="string", format="date", nullable=true, example="2026-03-10", description="null = indefinite override"),
 *   @OA\Property(property="is_day_off", type="boolean", example=false),
 *   @OA\Property(property="expected_start", type="string", format="time", nullable=true, example="09:00"),
 *   @OA\Property(property="expected_lunch_start", type="string", format="time", nullable=true, example="14:00"),
 *   @OA\Property(property="expected_lunch_end", type="string", format="time", nullable=true, example="15:00"),
 *   @OA\Property(property="lunch_duration_minutes", type="integer", nullable=true, example=60),
 *   @OA\Property(property="expected_end", type="string", format="time", nullable=true, example="18:00"),
 *   @OA\Property(property="note", type="string", nullable=true, maxLength=255, example="Paco llega tarde este lunes")
 * )
 */
class StoreScheduleDayOverrideRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'day_of_week' => ['required', 'integer', 'min:1', 'max:7'],
            'effective_from' => ['required', 'date'],
            'effective_to' => ['nullable', 'date', 'after_or_equal:effective_from'],
            'is_day_off' => ['required', 'boolean'],
            'expected_start' => ['nullable', 'date_format:H:i'],
            'expected_lunch_start' => ['nullable', 'date_format:H:i'],
            'expected_lunch_end' => ['nullable', 'date_format:H:i'],
            'lunch_duration_minutes' => ['nullable', 'integer', 'min:1', 'max:480'],
            'expected_end' => ['nullable', 'date_format:H:i'],
            'note' => ['nullable', 'string', 'max:255'],
        ];
    }

    public function withValidator($validator): void
    {
        $validator->after(function ($v) {
            $isDayOff = filter_var($this->input('is_day_off', false), FILTER_VALIDATE_BOOLEAN);

            if (! $isDayOff) {
                if (empty($this->input('expected_start'))) {
                    $v->errors()->add('expected_start', 'La hora de entrada es requerida para días laborales.');
                }
                if (empty($this->input('expected_end'))) {
                    $v->errors()->add('expected_end', 'La hora de salida es requerida para días laborales.');
                }
            }
        });
    }

    public function messages(): array
    {
        return [
            'day_of_week.min' => 'El día debe ser entre 1 (lunes) y 7 (domingo).',
            'day_of_week.max' => 'El día debe ser entre 1 (lunes) y 7 (domingo).',
            'effective_to.after_or_equal' => 'La fecha de fin debe ser igual o posterior a la fecha de inicio.',
            'expected_start.date_format' => 'La hora de entrada debe tener formato HH:MM (ej. 08:00).',
            'expected_end.date_format' => 'La hora de salida debe tener formato HH:MM (ej. 17:00).',
        ];
    }
}
