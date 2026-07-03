<?php

namespace App\Models;

use App\Enums\OvertimeValuationMethod;
use App\Support\Traits\HasPublicId;
use Carbon\Carbon;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class OvertimePayConfig extends Model
{
    use HasFactory, HasPublicId;

    protected $fillable = [
        'employee_id',
        'valuation_method',
        'lft_factor',
        'hourly_rate',
        'effective_from',
        'effective_to',
    ];

    protected $casts = [
        'valuation_method' => OvertimeValuationMethod::class,
        'lft_factor' => 'decimal:2',
        'hourly_rate' => 'decimal:2',
        'effective_from' => 'date',
        'effective_to' => 'date',
    ];

    public function employee(): BelongsTo
    {
        return $this->belongsTo(Employee::class);
    }

    /** Returns the config active on a given date (effective_from ≤ date, effective_to is null or ≥ date). */
    public function scopeEffective(Builder $query, Carbon $date): Builder
    {
        return $query
            ->where('effective_from', '<=', $date->toDateString())
            ->where(function (Builder $q) use ($date) {
                $q->whereNull('effective_to')
                    ->orWhere('effective_to', '>=', $date->toDateString());
            });
    }

    /**
     * Calculate the overtime pay for a number of minutes, given the method configured.
     *
     * LFT_PROPORTIONAL: (dailyWage / 8 / 60) × lft_factor × minutes
     * AGREED_RATE: (hourly_rate / 60) × minutes
     */
    public function calculatePay(int $minutes, float $dailyWage): float
    {
        return match ($this->valuation_method) {
            OvertimeValuationMethod::LFT_PROPORTIONAL => ($dailyWage / 8 / 60) * (float) $this->lft_factor * $minutes,
            OvertimeValuationMethod::AGREED_RATE => ((float) $this->hourly_rate / 60) * $minutes,
        };
    }
}
