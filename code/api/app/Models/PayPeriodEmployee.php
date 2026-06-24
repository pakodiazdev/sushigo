<?php

namespace App\Models;

use App\Support\Traits\HasPublicId;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class PayPeriodEmployee extends Model
{
    use HasPublicId;

    protected $fillable = [
        'pay_period_id',
        'employee_id',
        'base_pay',
        'late_deductions',
        'unpaid_leave_deductions',
        'overtime_pay',
        'extra_day_pay',
        'punctuality_bonus',
        'holiday_pay',
        'other_adjustments',
        'total_pay',
        'free_hours_earned',
        'daily_snapshot',
    ];

    protected $casts = [
        'base_pay' => 'decimal:2',
        'late_deductions' => 'decimal:2',
        'unpaid_leave_deductions' => 'decimal:2',
        'overtime_pay' => 'decimal:2',
        'extra_day_pay' => 'decimal:2',
        'punctuality_bonus' => 'decimal:2',
        'holiday_pay' => 'decimal:2',
        'other_adjustments' => 'decimal:2',
        'total_pay' => 'decimal:2',
        'free_hours_earned' => 'decimal:2',
        'daily_snapshot' => 'array',
    ];

    public function payPeriod(): BelongsTo
    {
        return $this->belongsTo(PayPeriod::class);
    }

    public function employee(): BelongsTo
    {
        return $this->belongsTo(Employee::class);
    }

    public function lines(): HasMany
    {
        return $this->hasMany(PayPeriodLine::class);
    }

    public function calculateTotal(): float
    {
        return (float) $this->base_pay
            - (float) $this->late_deductions
            - (float) $this->unpaid_leave_deductions
            + (float) $this->overtime_pay
            + (float) $this->extra_day_pay
            + (float) $this->punctuality_bonus
            + (float) $this->holiday_pay
            + (float) $this->other_adjustments;
    }
}
