<?php

namespace App\Models;

use App\Support\Traits\HasPublicId;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class OvertimeBankMovement extends Model
{
    use HasFactory;
    use HasPublicId;

    const TYPE_EARNED = 'EARNED';

    const TYPE_PAID = 'PAID';

    const TYPE_EXPIRED = 'EXPIRED';

    const TYPE_TRANSFERRED = 'TRANSFERRED';

    protected $fillable = [
        'employee_id',
        'attendance_id',
        'date',
        'type',
        'minutes',
        'reference',
        'meta',
    ];

    protected $casts = [
        'date' => 'date',
        'minutes' => 'integer',
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

    public function scopePaid(Builder $query): Builder
    {
        return $query->where('type', self::TYPE_PAID);
    }

    public function scopeEarned(Builder $query): Builder
    {
        return $query->where('type', self::TYPE_EARNED);
    }

    public function scopeInPeriod(Builder $query, string $start, string $end): Builder
    {
        return $query->whereBetween('date', [$start, $end]);
    }
}
