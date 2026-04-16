<?php

namespace App\Models;

use App\Support\Traits\HasPublicId;
use DateTimeInterface;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class EmploymentPeriod extends Model
{
    use HasFactory, HasPublicId, SoftDeletes;

    protected $fillable = [
        'employee_id',
        'branch_id',
        'start_date',
        'end_date',
        'termination_reason',
        'is_active',
        'meta',
    ];

    protected $casts = [
        'start_date' => 'date',
        'end_date' => 'date',
        'is_active' => 'boolean',
        'meta' => 'array',
    ];

    public function employee(): BelongsTo
    {
        return $this->belongsTo(Employee::class);
    }

    public function branch(): BelongsTo
    {
        return $this->belongsTo(Branch::class);
    }

    /**
     * All schedule versions associated with this employment period.
     * Use the effective() scope to get the active one for a given date.
     */
    public function employeeSchedules(): HasMany
    {
        return $this->hasMany(EmployeeSchedule::class)->orderBy('effective_from', 'desc');
    }

    /**
     * Day-level overrides (temporary exceptions) for this employment period.
     * Use the effective() or notExpired() scope to filter by date.
     */
    public function scheduleDayOverrides(): HasMany
    {
        return $this->hasMany(ScheduleDayOverride::class)->orderBy('effective_from');
    }

    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    /**
     * Calculate the duration of this employment period in days.
     *
     * @param  DateTimeInterface|null  $referenceDate  Date to use as "today" for active periods.
     *                                                 When null (default), uses system now().
     *                                                 Callers with access to ApplicationClock should pass
     *                                                 $clock->todayInBusinessTz() for testable business logic.
     */
    public function durationInDays(?DateTimeInterface $referenceDate = null): int
    {
        $end = $this->end_date ?? ($referenceDate ?? now());

        return (int) $this->start_date->diffInDays($end);
    }
}
