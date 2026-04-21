<?php

namespace App\Models;

use App\Enums\EmployeeRequestStatus;
use App\Enums\EmployeeRequestType;
use App\Support\Traits\HasPublicId;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\MorphTo;

class EmployeeRequest extends Model
{
    use HasFactory, HasPublicId;

    protected $fillable = [
        'employee_id',
        'type',
        'status',
        'requestable_type',
        'requestable_id',
        'payload',
        'requested_by',
        'approved_by',
        'approved_at',
        'notes',
        'rejection_reason',
    ];

    protected $casts = [
        'type' => EmployeeRequestType::class,
        'status' => EmployeeRequestStatus::class,
        'payload' => 'array',
        'approved_at' => 'datetime',
    ];

    public function employee(): BelongsTo
    {
        return $this->belongsTo(Employee::class);
    }

    public function requestable(): MorphTo
    {
        return $this->morphTo();
    }

    public function requestedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'requested_by');
    }

    public function approvedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'approved_by');
    }
}
