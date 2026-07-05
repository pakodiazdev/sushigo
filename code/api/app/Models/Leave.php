<?php

namespace App\Models;

use App\Enums\DayStatus;
use App\Enums\LeaveStatus;
use App\Enums\LeaveTimeMode;
use App\Enums\RestDayFactor;
use App\Support\Traits\HasPublicId;
use Carbon\Carbon;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Leave extends Model
{
    use HasFactory, HasPublicId, SoftDeletes;

    protected $fillable = [
        'employee_id',
        'leave_type_id',
        'start_date',
        'end_date',
        'pay_percentage',
        'rest_day_factor',
        'time_mode',
        'scheduled_start_time',
        'scheduled_end_time',
        'actual_start_time',
        'actual_end_time',
        'actual_duration_minutes',
        'status',
        'requested_by',
        'approved_by',
        'approved_at',
        'notes',
    ];

    protected $casts = [
        'start_date' => 'date',
        'end_date' => 'date',
        'pay_percentage' => 'decimal:2',
        'rest_day_factor' => RestDayFactor::class,
        'time_mode' => LeaveTimeMode::class,
        'status' => LeaveStatus::class,
        'approved_at' => 'datetime',
    ];

    // ── Relationships ────────────────────────────────────────────────────────

    public function employee(): BelongsTo
    {
        return $this->belongsTo(Employee::class);
    }

    public function leaveType(): BelongsTo
    {
        return $this->belongsTo(LeaveType::class);
    }

    public function requestedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'requested_by');
    }

    public function approvedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'approved_by');
    }

    /**
     * The exact set of days this leave covers. start_date/end_date remain as
     * derived MIN/MAX bounds for range-based filtering and display, but the
     * authoritative "does this leave cover day X" answer is this list —
     * leaves may cover non-contiguous days (e.g. Monday + Wednesday).
     */
    public function dates(): HasMany
    {
        return $this->hasMany(LeaveDate::class);
    }

    /**
     * Cancellation (EmployeeRequestService::cancel()) and the Employee-deletion
     * cascade (Employee::booted()) both forceDelete() a Leave directly, without
     * going through a dedicated "revert" step. Attendance LEAVE records have no
     * FK to leaves, so without this hook they'd be orphaned — still blocking
     * check-ins and hiding the employee from CloseDayAction/reports for those
     * dates even after the leave itself is gone.
     */
    protected static function booted(): void
    {
        static::forceDeleting(function (Leave $leave) {
            $dates = $leave->dates()->pluck('date')->map(fn (Carbon $date) => $date->toDateString());

            Attendance::where('employee_id', $leave->employee_id)
                ->where('day_status', DayStatus::LEAVE)
                ->whereIn('date', $dates)
                ->delete();
        });
    }

    // ── Scopes ───────────────────────────────────────────────────────────────

    public function scopeApproved(Builder $query): Builder
    {
        return $query->where('status', LeaveStatus::APPROVED);
    }

    public function scopePending(Builder $query): Builder
    {
        return $query->where('status', LeaveStatus::PENDING);
    }

    /**
     * Leaves that cover a specific date. Checks the exact selected days
     * (leave_dates), not the start_date/end_date bounding range — a leave
     * covering Monday and Wednesday does NOT cover Tuesday.
     */
    public function scopeForDate(Builder $query, string $date): Builder
    {
        return $query->whereHas('dates', function (Builder $q) use ($date) {
            $q->whereDate('date', $date);
        });
    }

    // ── Business logic ───────────────────────────────────────────────────────

    /**
     * Resolved pay percentage considering instance override and type default.
     */
    public function resolvedPayPercentage(): float
    {
        return $this->pay_percentage !== null
            ? (float) $this->pay_percentage
            : (float) $this->leaveType->default_pay_percentage;
    }

    /**
     * Resolved rest-day factor considering instance override and type default.
     */
    public function resolvedRestDayFactor(): RestDayFactor
    {
        return $this->rest_day_factor ?? $this->leaveType->default_rest_day_factor;
    }

    /**
     * Computed duration in minutes.
     * Uses actual times if recorded, falls back to scheduled times.
     */
    public function computedDurationMinutes(): ?int
    {
        if ($this->actual_duration_minutes !== null) {
            return $this->actual_duration_minutes;
        }

        if ($this->scheduled_start_time && $this->scheduled_end_time) {
            $start = Carbon::parse($this->scheduled_start_time);
            $end = Carbon::parse($this->scheduled_end_time);

            return (int) $start->diffInMinutes($end, absolute: true);
        }

        return null;
    }
}
