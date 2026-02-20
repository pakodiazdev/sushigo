<?php

namespace App\Models;

use App\Support\Traits\HasPublicId;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

class WageHistory extends Model
{
    use HasFactory, HasPublicId, SoftDeletes;

    /**
     * Validation rules shared between CreateWageRequest and UpdateWageRequest.
     * daily_wage must be strictly positive — zero or negative wages are invalid.
     */
    const RULES = [
        'daily_wage'     => ['required', 'numeric', 'gt:0'],
        'effective_from' => ['required', 'date'],
        'effective_to'   => ['nullable', 'date', 'after_or_equal:effective_from'],
    ];

    protected $fillable = [
        'employee_id',
        'daily_wage',
        'effective_from',
        'effective_to',
    ];

    protected $casts = [
        'daily_wage'     => 'decimal:2',
        'effective_from' => 'date',
        'effective_to'   => 'date',
    ];

    // ── Relationships ────────────────────────────────────────────────────────────

    public function employee(): BelongsTo
    {
        return $this->belongsTo(Employee::class);
    }

    // ── Scopes ───────────────────────────────────────────────────────────────────

    /**
     * Filter wage records that were effective on a given date.
     *
     * A record is effective when:
     *   effective_from <= $date AND (effective_to IS NULL OR effective_to >= $date)
     *
     * NULL effective_to means the wage is currently active (open-ended).
     *
     * Note: this scope does not filter by employee or check whether the related
     * employee has been soft-deleted. Callers must chain ->where('employee_id', …)
     * (or equivalent) to avoid returning wage records for deleted employees.
     * This mirrors the same pattern used by EmploymentPeriod::scopeEffective().
     */
    public function scopeEffective(Builder $query, \DateTimeInterface|string $date): Builder
    {
        return $query
            ->where('effective_from', '<=', $date)
            ->where(function (Builder $q) use ($date) {
                $q->whereNull('effective_to')
                    ->orWhere('effective_to', '>=', $date);
            });
    }

    // ── Methods ──────────────────────────────────────────────────────────────────

    /**
     * Calculate the per-minute rate for this wage.
     *
     * Based on an 8-hour workday (8h × 60min = 480 minutes).
     * Example: $1 000/day → $2.0833.../min
     *
     * @return float
     */
    public function minuteRate(): float
    {
        return (float) $this->daily_wage / 480;
    }
}
