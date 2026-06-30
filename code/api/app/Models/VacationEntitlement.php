<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class VacationEntitlement extends Model
{
    protected $fillable = [
        'employee_id',
        'year',
        'entitled_days',
        'used_days',
        'rule_key',
    ];

    protected $casts = [
        'year' => 'integer',
        'entitled_days' => 'integer',
        'used_days' => 'integer',
    ];

    public function employee(): BelongsTo
    {
        return $this->belongsTo(Employee::class);
    }

    public function remainingDays(): int
    {
        return $this->entitled_days - $this->used_days;
    }
}
