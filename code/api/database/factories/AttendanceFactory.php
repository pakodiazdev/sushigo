<?php

namespace Database\Factories;

use App\Enums\DayStatus;
use App\Models\Attendance;
use App\Models\Employee;
use Illuminate\Database\Eloquent\Factories\Factory;

/** @extends Factory<Attendance> */
class AttendanceFactory extends Factory
{
    protected $model = Attendance::class;

    public function definition(): array
    {
        $checkIn  = fake()->dateTimeBetween('today 07:00', 'today 09:30');
        $checkOut = fake()->dateTimeBetween('today 16:00', 'today 19:00');

        return [
            'employee_id'            => Employee::factory(),
            'date'                   => now()->toDateString(),
            'check_in'               => $checkIn,
            'check_out'              => $checkOut,
            'lunch_start'            => null,
            'lunch_end'              => null,
            'entry_late_seconds'     => 0,
            'lunch_late_seconds'     => 0,
            'net_worked_minutes'     => null,
            'overtime_minutes'       => 0,
            'overtime_authorized'    => false,
            'overtime_authorized_by' => null,
            'overtime_authorized_at' => null,
            'day_status'             => DayStatus::WORKED,
            'confirmed_by'           => null,
            'meta'                   => null,
        ];
    }

    // ── Status states ─────────────────────────────────────────────────────────

    public function worked(): static
    {
        return $this->state(fn () => [
            'day_status' => DayStatus::WORKED,
            'check_in'   => fake()->dateTimeBetween('today 07:00', 'today 09:30'),
            'check_out'  => fake()->dateTimeBetween('today 16:00', 'today 19:00'),
        ]);
    }

    public function dayOff(): static
    {
        return $this->state(fn () => [
            'day_status' => DayStatus::DAY_OFF,
            'check_in'   => null,
            'check_out'  => null,
        ]);
    }

    public function absence(): static
    {
        return $this->state(fn () => [
            'day_status' => DayStatus::ABSENCE,
            'check_in'   => null,
            'check_out'  => null,
        ]);
    }

    public function leave(): static
    {
        return $this->state(fn () => [
            'day_status' => DayStatus::LEAVE,
            'check_in'   => null,
            'check_out'  => null,
        ]);
    }

    public function vacation(): static
    {
        return $this->state(fn () => [
            'day_status' => DayStatus::VACATION,
            'check_in'   => null,
            'check_out'  => null,
        ]);
    }

    public function holiday(): static
    {
        return $this->state(fn () => [
            'day_status' => DayStatus::HOLIDAY,
            'check_in'   => null,
            'check_out'  => null,
        ]);
    }

    public function extra(): static
    {
        return $this->state(fn () => [
            'day_status' => DayStatus::EXTRA,
            'check_in'   => fake()->dateTimeBetween('today 07:00', 'today 09:00'),
            'check_out'  => fake()->dateTimeBetween('today 16:00', 'today 19:00'),
        ]);
    }

    // ── Behaviour states ──────────────────────────────────────────────────────

    /**
     * Employee arrived late by the given number of seconds.
     */
    public function late(int $seconds = 2700): static
    {
        return $this->state(fn () => [
            'day_status'         => DayStatus::WORKED,
            'entry_late_seconds' => $seconds,
        ]);
    }

    /**
     * Employee worked overtime by the given number of minutes.
     */
    public function withOvertime(int $minutes = 60): static
    {
        return $this->state(fn () => [
            'overtime_minutes' => $minutes,
        ]);
    }

    /**
     * Pin the attendance to a specific date (useful for unique constraint tests).
     */
    public function onDate(string $date): static
    {
        return $this->state(fn () => ['date' => $date]);
    }
}
