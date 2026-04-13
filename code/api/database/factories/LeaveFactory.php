<?php

namespace Database\Factories;

use App\Enums\LeaveStatus;
use App\Enums\LeaveTimeMode;
use App\Models\Employee;
use App\Models\Leave;
use App\Models\LeaveType;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/** @extends Factory<Leave> */
class LeaveFactory extends Factory
{
    protected $model = Leave::class;

    public function definition(): array
    {
        $today = now()->toDateString();

        return [
            'employee_id' => Employee::factory(),
            'leave_type_id' => LeaveType::factory(),
            'start_date' => $today,
            'end_date' => $today,
            'pay_percentage' => null,   // use leave type default
            'rest_day_factor' => null,  // use leave type default
            'time_mode' => null,
            'scheduled_start_time' => null,
            'scheduled_end_time' => null,
            'actual_start_time' => null,
            'actual_end_time' => null,
            'actual_duration_minutes' => null,
            'status' => LeaveStatus::PENDING,
            'requested_by' => User::factory(),
            'approved_by' => null,
            'approved_at' => null,
            'notes' => null,
        ];
    }

    // ── Status states ─────────────────────────────────────────────────────────

    public function approved(): static
    {
        return $this->state(fn () => [
            'status' => LeaveStatus::APPROVED,
            'approved_by' => User::factory(),
            'approved_at' => now(),
        ]);
    }

    public function rejected(): static
    {
        return $this->state(fn () => ['status' => LeaveStatus::REJECTED]);
    }

    // ── Time mode states ──────────────────────────────────────────────────────

    public function openEnded(): static
    {
        return $this->state(fn () => ['time_mode' => LeaveTimeMode::OPEN_ENDED]);
    }

    public function scheduled(string $startTime = '09:00:00', string $endTime = '14:00:00'): static
    {
        return $this->state(fn () => [
            'time_mode' => LeaveTimeMode::SCHEDULED,
            'scheduled_start_time' => $startTime,
            'scheduled_end_time' => $endTime,
        ]);
    }

    // ── Date helpers ──────────────────────────────────────────────────────────

    public function coveringDate(string $date): static
    {
        return $this->state(fn () => [
            'start_date' => $date,
            'end_date' => $date,
        ]);
    }
}
