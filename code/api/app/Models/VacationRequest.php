<?php

namespace App\Models;

use App\Enums\VacationRequestStatus;
use App\Support\Traits\HasPublicId;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class VacationRequest extends Model
{
    use HasFactory, HasPublicId;

    protected $fillable = [
        'employee_id',
        'vacation_entitlement_id',
        'start_date',
        'end_date',
        'days_count',
        'status',
        'requested_by',
        'approved_by',
        'approved_at',
        'notes',
    ];

    protected $casts = [
        'start_date' => 'date',
        'end_date' => 'date',
        'days_count' => 'integer',
        'status' => VacationRequestStatus::class,
        'approved_at' => 'datetime',
    ];

    // ── Relationships ────────────────────────────────────────────────────────

    public function employee(): BelongsTo
    {
        return $this->belongsTo(Employee::class);
    }

    public function vacationEntitlement(): BelongsTo
    {
        return $this->belongsTo(VacationEntitlement::class);
    }

    public function requestedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'requested_by');
    }

    public function approvedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'approved_by');
    }

    // ── Scopes ───────────────────────────────────────────────────────────────

    public function scopeApproved(Builder $query): Builder
    {
        return $query->where('status', VacationRequestStatus::APPROVED);
    }

    public function scopePending(Builder $query): Builder
    {
        return $query->where('status', VacationRequestStatus::PENDING);
    }

    /**
     * Vacation requests that cover a specific date.
     */
    public function scopeForDate(Builder $query, string $date): Builder
    {
        return $query->where('start_date', '<=', $date)
            ->where('end_date', '>=', $date);
    }
}
