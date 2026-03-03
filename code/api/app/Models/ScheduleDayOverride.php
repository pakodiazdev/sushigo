<?php

namespace App\Models;

use App\Support\Traits\HasPublicId;
use DateTimeInterface;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

/**
 * Temporary exception for a specific day-of-week within an employment period.
 *
 * An override replaces the base EmployeeSchedule times for the given day_of_week
 * on any date D where: effective_from <= D AND (effective_to IS NULL OR effective_to >= D).
 *
 * Three override scopes (set by the caller):
 *   - Single date  : effective_from = effective_to = chosen date
 *   - Date range   : effective_from = start, effective_to = end
 *   - Indefinite   : effective_from = start, effective_to = NULL
 *
 * Overrides are never deleted manually — they expire naturally when effective_to passes.
 *
 * @see AP-012, RF-10
 */
class ScheduleDayOverride extends Model
{
    use HasFactory, HasPublicId, SoftDeletes;

    protected $fillable = [
        'employment_period_id',
        'day_of_week',
        'effective_from',
        'effective_to',
        'is_day_off',
        'expected_start',
        'expected_lunch_start',
        'expected_lunch_end',
        'lunch_duration_minutes',
        'expected_end',
        'note',
    ];

    protected $casts = [
        'effective_from'         => 'date',
        'effective_to'           => 'date',
        'is_day_off'             => 'boolean',
        'day_of_week'            => 'integer',
        'expected_start'         => 'datetime',
        'expected_lunch_start'   => 'datetime',
        'expected_lunch_end'     => 'datetime',
        'lunch_duration_minutes' => 'integer',
        'expected_end'           => 'datetime',
    ];

    // #region Relationships

    public function employmentPeriod(): BelongsTo
    {
        return $this->belongsTo(EmploymentPeriod::class);
    }

    // #endregion

    // #region Scopes

    /**
     * Return overrides that are effective on a given date.
     *
     * An override is effective when:
     *   effective_from <= $date AND (effective_to IS NULL OR effective_to >= $date)
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

    /**
     * Return overrides that have not yet expired (active today or in the future).
     *
     * Useful for displaying upcoming overrides alongside the base schedule.
     */
    public function scopeNotExpired(Builder $query): Builder
    {
        $today = now()->toDateString();

        return $query->where(function (Builder $q) use ($today) {
            $q->whereNull('effective_to')
                ->orWhere('effective_to', '>=', $today);
        });
    }

    // #endregion
}
