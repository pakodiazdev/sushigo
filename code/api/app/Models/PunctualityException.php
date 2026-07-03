<?php

namespace App\Models;

use App\Support\Traits\HasPublicId;
use Carbon\Carbon;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PunctualityException extends Model
{
    use HasPublicId;

    protected $fillable = [
        'employee_id',
        'day_of_week',
        'forced_percentage',
        'effective_from',
        'effective_to',
        'reason',
    ];

    protected $casts = [
        'day_of_week' => 'integer',
        'forced_percentage' => 'decimal:2',
        'effective_from' => 'date',
        'effective_to' => 'date',
    ];

    public function employee(): BelongsTo
    {
        return $this->belongsTo(Employee::class);
    }

    /** Exceptions effective on a given date. */
    public function scopeEffective(Builder $query, Carbon $date): Builder
    {
        return $query
            ->where('effective_from', '<=', $date->toDateString())
            ->where(function (Builder $q) use ($date) {
                $q->whereNull('effective_to')
                    ->orWhere('effective_to', '>=', $date->toDateString());
            });
    }

    /** True if this exception applies to the given day-of-week (0=Sun … 6=Sat). Null day_of_week = applies every day. */
    public function appliesToDay(int $dayOfWeek): bool
    {
        return $this->day_of_week === null || $this->day_of_week === $dayOfWeek;
    }
}
