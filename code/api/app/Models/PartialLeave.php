<?php

namespace App\Models;

use App\Support\Traits\HasPublicId;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PartialLeave extends Model
{
    use HasFactory;
    use HasPublicId;

    protected $fillable = [
        'attendance_id',
        'employee_id',
        'date',
        'duration_minutes',
        'is_paid',
        'reason',
        'meta',
    ];

    protected $casts = [
        'date' => 'date',
        'duration_minutes' => 'integer',
        'is_paid' => 'boolean',
        'meta' => 'array',
    ];

    public function attendance(): BelongsTo
    {
        return $this->belongsTo(Attendance::class);
    }

    public function employee(): BelongsTo
    {
        return $this->belongsTo(Employee::class);
    }
}
