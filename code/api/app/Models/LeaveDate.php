<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class LeaveDate extends Model
{
    protected $fillable = [
        'leave_id',
        'date',
    ];

    protected $casts = [
        'date' => 'date',
    ];

    public function leave(): BelongsTo
    {
        return $this->belongsTo(Leave::class);
    }
}
