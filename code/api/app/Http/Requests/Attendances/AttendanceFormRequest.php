<?php

namespace App\Http\Requests\Attendances;

use App\Http\Requests\Concerns\GuardsClosedPayPeriod;
use App\Models\Attendance;
use App\Support\Clock\ApplicationClock;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\Validator;

/**
 * Base request for attendance-edit endpoints that share:
 *  - authorization via AttendancePolicy::edit
 *  - optional/required reason field based on admin + past-day detection
 *  - a guard blocking edits to dates already frozen in a CLOSED PayPeriod
 */
abstract class AttendanceFormRequest extends FormRequest
{
    use GuardsClosedPayPeriod;

    public function __construct(private readonly ApplicationClock $clock)
    {
        parent::__construct();
    }

    private bool $hasResolved = false;

    private ?Attendance $resolvedAttendance = null;

    public function authorize(): bool
    {
        $attendance = $this->resolveAttendance();
        if (! $attendance) {
            return true; // controller will return 404
        }

        if (! Gate::allows('edit', $attendance)) {
            return false;
        }

        return ! $this->isCorrectingWithoutPermission($attendance);
    }

    /**
     * Subclasses covering one of the four attendance transitions (check-in,
     * lunch-start, lunch-return, check-out) return the attribute they write.
     * When that attribute is already set on the resolved attendance, this
     * request is correcting an already-recorded event and requires
     * attendances.update on top of the date-based AttendancePolicy::edit rule.
     */
    protected function correctionField(): ?string
    {
        return null;
    }

    private function isCorrectingWithoutPermission(Attendance $attendance): bool
    {
        $field = $this->correctionField();
        if (! $field || $attendance->{$field} === null) {
            return false;
        }

        return ! $this->user()?->can('attendances.update');
    }

    public function withValidator(Validator $validator): void
    {
        $attendance = $this->resolveAttendance();
        if (! $attendance) {
            return;
        }

        $this->guardClosedPeriod($validator, $attendance->employee_id, $attendance->date->toDateString());
    }

    protected function resolveAttendance(): ?Attendance
    {
        if (! $this->hasResolved) {
            $this->resolvedAttendance = Attendance::where('public_id', $this->route('id'))->first();
            $this->hasResolved = true;
        }

        return $this->resolvedAttendance;
    }

    protected function reasonRules(): array
    {
        $attendance = $this->resolveAttendance();
        if (! $attendance) {
            return ['nullable', 'string', 'max:500'];
        }

        $user = $this->user();
        $isAdmin = $user?->hasRole('admin') || $user?->hasRole('super-admin');
        $today = $this->clock->todayInBusinessTz();
        $isPastDay = $attendance->date->toDateString() < $today;

        return ($isAdmin && $isPastDay)
            ? ['required', 'string', 'min:5', 'max:500']
            : ['nullable', 'string', 'max:500'];
    }
}
