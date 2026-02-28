<?php

namespace App\Models;

use App\Enums\WorkdayType;
use App\Support\Traits\HasPublicId;
use DateTimeInterface;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

/**
 * Effective-dated schedule version for an employment period.
 *
 * Each employee has a schedule that defines their expected working times per
 * day of the week. Schedules are versioned — when times change, a new
 * EmployeeSchedule is created with a new effective range and the previous
 * one is closed (effective_to set). Only ONE schedule may be active
 * (effective_to = NULL) per employment period at any time.
 *
 * Usage:
 *   EmployeeSchedule::effective('2026-03-01')
 *       ->where('employment_period_id', $period->id)
 *       ->first();
 *
 * @see AP-007, RF-08, RF-09, RF-10
 */
class EmployeeSchedule extends Model
{
    use HasFactory, HasPublicId, SoftDeletes;

    protected $fillable = [
        'employment_period_id',
        'name',
        'effective_from',
        'effective_to',
        'workday_type',
        'working_days_per_week',
    ];

    protected $casts = [
        'effective_from' => 'date',
        'effective_to' => 'date',
        'workday_type' => WorkdayType::class,
        'working_days_per_week' => 'integer',
    ];

    // #region Relationships

    public function employmentPeriod(): BelongsTo
    {
        return $this->belongsTo(EmploymentPeriod::class);
    }

    /**
     * Days configured for this schedule, ordered by ISO day of week (Mon→Sun).
     */
    public function scheduleDays(): HasMany
    {
        return $this->hasMany(ScheduleDay::class)->orderBy('day_of_week');
    }

    // #endregion

    // #region Scopes

    /**
     * Filter schedules that were effective on a given date.
     *
     * A schedule is effective when:
     *   effective_from <= $date AND (effective_to IS NULL OR effective_to >= $date)
     *
     * NULL effective_to means the schedule is currently active (open-ended).
     *
     * Note: this scope does not filter by employment period. Callers must chain
     * ->where('employment_period_id', …) to scope results to a specific period.
     */
    public function scopeEffective(Builder $query, DateTimeInterface|string $date): Builder
    {
        return $query
            ->where('effective_from', '<=', $date)
            ->where(function (Builder $q) use ($date) {
                $q->whereNull('effective_to')
                    ->orWhere('effective_to', '>=', $date);
            });
    }

    // #endregion

    // #region Methods

    /**
     * Return the ScheduleDay configuration for a given ISO day of week.
     *
     * Returns null when no configuration exists for that day (e.g., a 5-day
     * schedule won't have entries for Saturday and Sunday).
     *
     * @param  int  $dayOfWeek  ISO 8601: 1=Monday … 7=Sunday
     */
    public function dayConfig(int $dayOfWeek): ?ScheduleDay
    {
        return $this->scheduleDays()
            ->where('day_of_week', $dayOfWeek)
            ->first();
    }

    /**
     * Return all ScheduleDay records that are NOT marked as day off.
     *
     * @return Collection<ScheduleDay>
     */
    public function workingDays(): Collection
    {
        return $this->scheduleDays()
            ->where('is_day_off', false)
            ->get();
    }
    // #endregion

}
