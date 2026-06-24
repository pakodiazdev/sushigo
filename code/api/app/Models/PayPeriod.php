<?php

namespace App\Models;

use App\Support\Traits\HasPublicId;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class PayPeriod extends Model
{
    use HasPublicId;

    const STATUS_OPEN = 'OPEN';

    const STATUS_CLOSED = 'CLOSED';

    const STATUS_REOPENED = 'REOPENED';

    protected $fillable = [
        'branch_id',
        'period_start',
        'period_end',
        'status',
        'closed_by',
        'closed_at',
        'reopened_by',
        'reopened_at',
        'reopen_reason',
        'meta',
    ];

    protected $casts = [
        'period_start' => 'date',
        'period_end' => 'date',
        'closed_at' => 'datetime',
        'reopened_at' => 'datetime',
        'meta' => 'array',
    ];

    public function branch(): BelongsTo
    {
        return $this->belongsTo(Branch::class);
    }

    public function closedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'closed_by');
    }

    public function reopenedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'reopened_by');
    }

    public function payPeriodEmployees(): HasMany
    {
        return $this->hasMany(PayPeriodEmployee::class);
    }

    public function isOpen(): bool
    {
        return $this->status === self::STATUS_OPEN;
    }

    public function isClosed(): bool
    {
        return $this->status === self::STATUS_CLOSED;
    }
}
