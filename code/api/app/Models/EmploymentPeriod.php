<?php

namespace App\Models;

use App\Support\Traits\HasPublicId;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class EmploymentPeriod extends Model
{
    use HasFactory, HasPublicId, SoftDeletes;

    protected $fillable = [
        'employee_id',
        'branch_id',
        'start_date',
        'end_date',
        'termination_reason',
        'is_active',
        'meta',
    ];

    protected $casts = [
        'start_date' => 'date',
        'end_date' => 'date',
        'is_active' => 'boolean',
        'meta' => 'array',
    ];

    public function employee(): BelongsTo
    {
        return $this->belongsTo(Employee::class);
    }

    public function branch(): BelongsTo
    {
        return $this->belongsTo(Branch::class);
    }

    /**
     * All schedule versions associated with this employment period.
     * Use the effective() scope to get the active one for a given date.
     */
    public function employeeSchedules(): HasMany
    {
        return $this->hasMany(EmployeeSchedule::class)->orderBy('effective_from', 'desc');
    }

    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    public function durationInDays(): int
    {
        $end = $this->end_date ?? now();

        return (int) $this->start_date->diffInDays($end);
    }
}
