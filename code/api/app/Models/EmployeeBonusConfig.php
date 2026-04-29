<?php

namespace App\Models;

use App\Support\Traits\HasPublicId;
use Carbon\Carbon;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class EmployeeBonusConfig extends Model
{
    use HasPublicId;

    protected $fillable = [
        'employee_id',
        'punctuality_bonus_group_id',
        'effective_from',
        'effective_to',
    ];

    protected $casts = [
        'effective_from' => 'date',
        'effective_to' => 'date',
    ];

    public function employee(): BelongsTo
    {
        return $this->belongsTo(Employee::class);
    }

    public function bonusGroup(): BelongsTo
    {
        return $this->belongsTo(PunctualityBonusGroup::class, 'punctuality_bonus_group_id');
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
}
