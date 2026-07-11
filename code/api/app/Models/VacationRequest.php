<?php

namespace App\Models;

use App\Enums\DayStatus;
use App\Enums\VacationRequestStatus;
use App\Support\Traits\HasPublicId;
use Carbon\Carbon;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class VacationRequest extends Model
{
    use HasFactory, HasPublicId, SoftDeletes;

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

    /**
     * The exact set of days this vacation request covers. start_date/end_date
     * remain as derived MIN/MAX bounds for range-based filtering and display,
     * but the authoritative "does this request cover day X" answer is this
     * list — a request may cover non-contiguous days (e.g. Monday + Wednesday).
     */
    public function dates(): HasMany
    {
        return $this->hasMany(VacationRequestDate::class);
    }

    /**
     * Cancellation (EmployeeRequestService::cancel()) force-deletes an
     * approved VacationRequest directly, without a dedicated "revert" step.
     * Attendance VACATION records have no FK to vacation_requests, and the
     * balance deducted on approval isn't reverted automatically, so without
     * this hook both would be left stale — still blocking check-ins and
     * showing the days as taken even after the vacation itself is gone.
     */
    protected static function booted(): void
    {
        static::forceDeleting(function (VacationRequest $vacationRequest) {
            $dates = $vacationRequest->dates()->pluck('date')->map(fn (Carbon $date) => $date->toDateString());

            Attendance::where('employee_id', $vacationRequest->employee_id)
                ->where('day_status', DayStatus::VACATION)
                ->whereIn('date', $dates)
                ->delete();

            if ($vacationRequest->status === VacationRequestStatus::APPROVED) {
                VacationEntitlement::where('id', $vacationRequest->vacation_entitlement_id)
                    ->lockForUpdate()
                    ->decrement('used_days', $vacationRequest->days_count);
            }
        });
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
     * Vacation requests that cover a specific date. Checks the exact selected
     * days (vacation_request_dates), not the start_date/end_date bounding
     * range — a request covering Monday and Wednesday does NOT cover Tuesday.
     */
    public function scopeForDate(Builder $query, string $date): Builder
    {
        return $query->whereHas('dates', function (Builder $q) use ($date) {
            $q->whereDate('date', $date);
        });
    }
}
