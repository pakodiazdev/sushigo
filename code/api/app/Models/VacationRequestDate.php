<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class VacationRequestDate extends Model
{
    protected $fillable = [
        'vacation_request_id',
        'date',
    ];

    protected $casts = [
        'date' => 'date',
    ];

    public function vacationRequest(): BelongsTo
    {
        return $this->belongsTo(VacationRequest::class);
    }
}
