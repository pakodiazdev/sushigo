<?php

namespace App\Models;

use App\Support\Traits\HasPublicId;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

class NegotiatedExtraDay extends Model
{
    use HasFactory, HasPublicId, SoftDeletes;

    const STATUS_APPROVED = 'APPROVED';

    protected $fillable = [
        'employee_id',
        'branch_id',
        'date',
        'agreed_daily_wage',
        'prima_percent',
        'prima_amount',
        'approved_by',
        'status',
        'notes',
    ];

    protected $casts = [
        'date' => 'date',
        'agreed_daily_wage' => 'decimal:4',
        'prima_percent' => 'decimal:4',
        'prima_amount' => 'decimal:4',
    ];

    // ── Relationships ────────────────────────────────────────────────────────

    public function employee(): BelongsTo
    {
        return $this->belongsTo(Employee::class);
    }

    public function branch(): BelongsTo
    {
        return $this->belongsTo(Branch::class);
    }

    public function approvedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'approved_by');
    }
}
