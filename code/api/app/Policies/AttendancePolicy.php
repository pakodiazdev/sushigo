<?php

namespace App\Policies;

use App\Models\Attendance;
use App\Models\User;
use Carbon\Carbon;

class AttendancePolicy
{
    /**
     * Determine whether the user can edit an existing attendance record.
     *
     * Managers (non-admin) may only edit today's records.
     * Admins and super-admins may edit any date but must supply a reason
     * for past-day edits — that validation is enforced in the FormRequest.
     */
    public function edit(User $user, Attendance $attendance): bool
    {
        return $this->isAdmin($user) || $this->isToday($attendance->date->toDateString());
    }

    /**
     * Same rule applied to a plain date string (used by POST endpoints where
     * no attendance model exists yet, e.g. check-in and day-status).
     */
    public function editByDate(User $user, string $date): bool
    {
        return $this->isAdmin($user) || $this->isToday($date);
    }

    private function isAdmin(User $user): bool
    {
        return $user->hasRole('admin') || $user->hasRole('super-admin');
    }

    private function isToday(string $date): bool
    {
        return $date === Carbon::today(config('app.business_timezone'))->toDateString();
    }
}
