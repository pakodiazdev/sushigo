<?php

namespace App\Models;

use App\Enums\LeaveStatus;
use App\Enums\LeaveTimeMode;
use App\Enums\RestDayFactor;
use App\Support\Traits\HasPublicId;
use Carbon\Carbon;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Leave extends Model
{
    use HasFactory, HasPublicId;

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
     * Leaves that cover a specific date.
     */
    public function scopeForDate(Builder $query, string $date): Builder
    {
        return $query->where('start_date', '<=', $date)
            ->where('end_date', '>=', $date);
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
