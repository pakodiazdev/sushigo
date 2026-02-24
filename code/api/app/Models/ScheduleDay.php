<?php

namespace App\Models;

use Carbon\Carbon;
use Carbon\CarbonInterface;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Daily time configuration within an EmployeeSchedule.
 *
 * Each row defines the expected working times for a single ISO day of week
 * (1=Monday … 7=Sunday). When is_day_off = true, all time fields are NULL
 * and expectedDurationMinutes() returns 0.
 *
 * Used by the check-in API to calculate entry_late_seconds by comparing
 * the actual clock-in time against expected_start.
 *
 * Used by the lunch-return API to calculate lunch_late_seconds by comparing
 * the actual return time against expected_lunch_end.
 *
 * expectedDurationMinutes() computes net working time:
 *   (expected_end − expected_start) − (expected_lunch_end − expected_lunch_start)
 *
 * @see AP-007, RF-08, RF-13, RF-14
 */
class ScheduleDay extends Model
{
    use HasFactory;

    protected $fillable = [
        'employee_schedule_id',
        'day_of_week',
        'is_day_off',
        'expected_start',
        'expected_lunch_start',
        'expected_lunch_end',
        'lunch_duration_minutes',
        'expected_end',
    ];

    protected $casts = [
        'is_day_off'              => 'boolean',
        'day_of_week'             => 'integer',
        'expected_start'          => 'datetime',
        'expected_lunch_start'    => 'datetime',
        'expected_lunch_end'      => 'datetime',
        'lunch_duration_minutes'  => 'integer',
        'expected_end'            => 'datetime',
    ];

    // ── Relationships ─────────────────────────────────────────────────────────

    public function employeeSchedule(): BelongsTo
    {
        return $this->belongsTo(EmployeeSchedule::class);
    }

    // ── Methods ───────────────────────────────────────────────────────────────

    /**
     * Return true when this day is a scheduled rest day.
     * Convenience wrapper around the boolean column.
     */
    public function isDayOff(): bool
    {
        return $this->is_day_off;
    }

    /**
     * Calculate the expected lunch return time for a given actual lunch_start.
     *
     * Returns null when lunch_duration_minutes is not configured — callers
     * should treat null as "no lunch tardiness tracking".
     *
     * Example: lunch_start=13:05, lunch_duration_minutes=60 → return 14:05.
     */
    public function expectedLunchReturnTime(CarbonInterface $lunchStart): ?Carbon
    {
        if (! $this->lunch_duration_minutes) {
            return null;
        }

        return $lunchStart->copy()->addMinutes($this->lunch_duration_minutes);
    }

    /**
     * Calculate the net expected working duration for this day in minutes.
     *
     * Returns 0 when is_day_off = true.
     * Returns null when expected_start or expected_end are not set
     *   (incomplete configuration — callers should guard against null).
     *
     * When both expected_lunch_start and expected_lunch_end are present, the
     * lunch break duration is subtracted from the gross working time.
     *
     * Example: 08:00→17:00 with lunch 13:00→14:00 → (9h − 1h) = 480 min.
     *
     * @return int|null Minutes of expected net work; null if times are missing.
     */
    public function expectedDurationMinutes(): ?int
    {
        if ($this->is_day_off) {
            return 0;
        }

        if (! $this->expected_start || ! $this->expected_end) {
            return null;
        }

        $start = Carbon::parse($this->expected_start);
        $end   = Carbon::parse($this->expected_end);

        $grossMinutes = $start->diffInMinutes($end);

        // Subtract lunch break when both boundaries are configured
        if ($this->expected_lunch_start && $this->expected_lunch_end) {
            $lunchStart    = Carbon::parse($this->expected_lunch_start);
            $lunchEnd      = Carbon::parse($this->expected_lunch_end);
            $lunchMinutes  = $lunchStart->diffInMinutes($lunchEnd);
            $grossMinutes -= $lunchMinutes;
        }

        return (int) $grossMinutes;
    }
}
