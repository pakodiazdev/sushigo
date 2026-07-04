<?php

namespace App\Models;

use App\Enums\LeaveCalculationMode;
use App\Enums\RestDayFactor;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class LeaveType extends Model
{
    use HasFactory;

    // Default type codes
    const MEDICAL = 'MEDICAL';

    const PERSONAL = 'PERSONAL';

    const PERMISSION_PAID = 'PERMISSION_PAID';

    const PERMISSION_UNPAID = 'PERMISSION_UNPAID';

    const PERMISSION_HOURS = 'PERMISSION_HOURS';

    protected $fillable = [
        'name',
        'code',
        'calculation_mode',
        'default_pay_percentage',
        'default_rest_day_factor',
        'counts_for_bonus',
        'is_active',
    ];

    protected $casts = [
        'calculation_mode' => LeaveCalculationMode::class,
        'default_pay_percentage' => 'decimal:2',
        'default_rest_day_factor' => RestDayFactor::class,
        'counts_for_bonus' => 'boolean',
        'is_active' => 'boolean',
    ];

    public function leaves(): HasMany
    {
        return $this->hasMany(Leave::class);
    }

    public function isProportionalHours(): bool
    {
        return $this->calculation_mode === LeaveCalculationMode::PROPORTIONAL_HOURS;
    }

    /**
     * Resolve effective pay percentage: instance override takes priority over type default.
     */
    public function resolvedPayPercentage(?float $override): float
    {
        return $override ?? (float) $this->default_pay_percentage;
    }

    /**
     * Resolve effective rest-day factor: instance override takes priority over type default.
     */
    public function resolvedRestDayFactor(?RestDayFactor $override): RestDayFactor
    {
        return $override ?? $this->default_rest_day_factor;
    }
}
