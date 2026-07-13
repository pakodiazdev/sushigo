<?php

namespace App\Models;

use App\Enums\OvertimeMovementType;
use App\Enums\OvertimeOrigin;
use App\Enums\OvertimeValuationMethod;
use App\Support\Traits\HasPublicId;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class OvertimeBankMovement extends Model
{
    use HasFactory;
    use HasPublicId;

    protected $fillable = [
        'employee_id',
        'attendance_id',
        'date',
        'movement_type',
        'origin',
        'minutes',
        'valuation_method',
        'applied_rate',
        'amount',
        'authorized_by',
        'authorized_at',
        'reason',
        'reference',
        'meta',
    ];

    protected $casts = [
        'date' => 'date',
        'movement_type' => OvertimeMovementType::class,
        'origin' => OvertimeOrigin::class,
        'minutes' => 'integer',
        'valuation_method' => OvertimeValuationMethod::class,
        'applied_rate' => 'decimal:2',
        'amount' => 'decimal:2',
        'authorized_at' => 'datetime',
        'meta' => 'array',
    ];

    public function employee(): BelongsTo
    {
        return $this->belongsTo(Employee::class);
    }

    public function attendance(): BelongsTo
    {
        return $this->belongsTo(Attendance::class);
    }

    public function authorizedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'authorized_by');
    }

    /** Positive impact = minutes added to the bank; negative = minutes removed. */
    public function balanceImpact(): int
    {
        return $this->movement_type->balanceImpact((int) $this->minutes);
    }

    public function scopePaid(Builder $query): Builder
    {
        return $query->where('movement_type', OvertimeMovementType::PAID);
    }

    public function scopeEarned(Builder $query): Builder
    {
        return $query->where('movement_type', OvertimeMovementType::EARNED);
    }

    public function scopeInPeriod(Builder $query, string $start, string $end): Builder
    {
        return $query->whereBetween('date', [$start, $end]);
    }
}
