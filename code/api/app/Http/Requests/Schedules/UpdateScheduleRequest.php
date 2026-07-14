<?php

namespace App\Http\Requests\Schedules;

use App\Http\Requests\Schedules\Concerns\ValidatesScheduleDays;
use Carbon\Carbon;
use Illuminate\Foundation\Http\FormRequest;

/**
 * @OA\Schema(
 *   schema="UpdateScheduleRequest",
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
class UpdateScheduleRequest extends FormRequest
{
    use ValidatesScheduleDays;

    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return $this->scheduleDayRules();
    }

    public function withValidator($validator): void
    {
        $validator->after(function ($v) {
            $this->validateScheduleIsActive($v);
            $this->validatePreviousScheduleBoundary($v);
            $this->validateWorkingDayFields($v, $this->input('days', []));
        });
    }

    private function validateScheduleIsActive($validator): void
    {
        $schedule = $this->route('schedule');

        if ($schedule && $schedule->effective_to !== null) {
            $validator->errors()->add(
                'schedule',
                'Solo se puede editar el horario activo (sin fecha de cierre).'
            );
        }
    }

    /**
     * When effective_from is moved, UpdateScheduleAction realigns the immediately
     * preceding schedule's effective_to to keep the timeline contiguous. That only
     * works if the new date stays strictly after the previous schedule's own
     * effective_from — otherwise the previous schedule would need effective_to
     * before its own effective_from, violating the DB CHECK constraint.
     */
    private function validatePreviousScheduleBoundary($validator): void
    {
        $schedule = $this->route('schedule');
        $newFrom = $this->input('effective_from');

        if (! $schedule || ! $newFrom) {
            return;
        }

        $previousFrom = $schedule->employmentPeriod
            ->employeeSchedules()
            ->where('id', '!=', $schedule->id)
            ->orderByDesc('effective_from')
            ->value('effective_from');

        if ($previousFrom && Carbon::parse($newFrom)->toDateString() <= Carbon::parse($previousFrom)->toDateString()) {
            $validator->errors()->add(
                'effective_from',
                'La fecha de inicio debe ser posterior al inicio del horario anterior ('.Carbon::parse($previousFrom)->toDateString().').'
            );
        }
    }

    public function messages(): array
    {
        return $this->scheduleDayMessages();
    }
}
