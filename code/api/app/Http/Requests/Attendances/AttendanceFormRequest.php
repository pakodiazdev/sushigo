<?php

namespace App\Http\Requests\Attendances;

use App\Models\Attendance;
use App\Support\Clock\ApplicationClock;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Facades\Gate;

/**
 * Base request for attendance-edit endpoints that share:
 *  - authorization via AttendancePolicy::edit
 *  - optional/required reason field based on admin + past-day detection
 */
abstract class AttendanceFormRequest extends FormRequest
{
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

        return Gate::allows('edit', $attendance);
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
