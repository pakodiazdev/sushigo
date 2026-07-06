<?php

namespace App\Models;

use App\Enums\DayStatus;
use App\Enums\OvertimeValuationMethod;
use App\Models\Concerns\Auditable;
use App\Support\Traits\HasPublicId;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Attendance extends Model
{
    use Auditable, HasFactory, HasPublicId;

    protected $fillable = [
        'employee_id',
        'date',
        'check_in',
        'check_out',
        'lunch_start',
        'lunch_end',
        'entry_late_seconds',
        'lunch_late_seconds',
        'net_worked_minutes',
        'overtime_minutes',
        'overtime_authorized',
        'overtime_authorized_by',
        'overtime_authorized_at',
        'overtime_valuation_method',
        'overtime_rate_applied',
        'overtime_amount',
        'day_status',
        'confirmed_by',
        'meta',
    ];

    protected $casts = [
        'date' => 'date',
        'check_in' => 'datetime',
        'check_out' => 'datetime',
        'lunch_start' => 'datetime',
        'lunch_end' => 'datetime',
        'entry_late_seconds' => 'integer',
        'lunch_late_seconds' => 'integer',
        'net_worked_minutes' => 'integer',
        'overtime_minutes' => 'integer',
        'overtime_authorized' => 'boolean',
        'overtime_authorized_at' => 'datetime',
        'overtime_valuation_method' => OvertimeValuationMethod::class,
        'overtime_rate_applied' => 'decimal:2',
        'overtime_amount' => 'decimal:2',
        'day_status' => DayStatus::class,
        'meta' => 'array',
    ];

    public function employee(): BelongsTo
    {
        return $this->belongsTo(Employee::class);
    }

    public function authorizedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'overtime_authorized_by');
    }

    public function confirmedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'confirmed_by');
    }

    public function partialLeaves(): HasMany
    {
        return $this->hasMany(PartialLeave::class);
    }

    public function overtimeBankMovements(): HasMany
    {
        return $this->hasMany(OvertimeBankMovement::class);
    }

    public function scopeByDate(Builder $query, string $date): Builder
    {
        return $query->where('date', $date);
    }

    public function scopeByStatus(Builder $query, DayStatus $status): Builder
    {
        return $query->where('day_status', $status->value);
    }

    public function scopeForEmployee(Builder $query, int $employeeId): Builder
    {
        return $query->where('employee_id', $employeeId);
    }

    /**
     * Whether the entry tardiness exceeds the 30-minute deductible threshold.
     *
     * The threshold is strictly greater than 1800 seconds (30 min).
     * Exactly 1800 seconds is NOT deductible. (RF-15b, RN-00)
     */
    public function isEntryLateDeductible(): bool
    {
        return $this->entry_late_seconds > 1800;
    }

    /**
     * Whether the lunch return tardiness exceeds the 30-minute deductible threshold.
     */
    public function isLunchLateDeductible(): bool
    {
        return $this->lunch_late_seconds > 1800;
    }

    /**
     * Entry tardiness converted to whole minutes (floor).
     */
    public function entryLateMinutes(): int
    {
        return (int) floor($this->entry_late_seconds / 60);
    }

    /**
     * Lunch return tardiness converted to whole minutes (floor).
     */
    public function lunchLateMinutes(): int
    {
        return (int) floor($this->lunch_late_seconds / 60);
    }
}
