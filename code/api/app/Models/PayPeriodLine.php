<?php

namespace App\Models;

use App\Support\Traits\HasPublicId;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PayPeriodLine extends Model
{
    use HasPublicId;

    const CONCEPT_BASE_PAY = 'BASE_PAY';

    const CONCEPT_LATE_DEDUCTION = 'LATE_DEDUCTION';

    const CONCEPT_UNPAID_LEAVE = 'UNPAID_LEAVE';

    const CONCEPT_OVERTIME = 'OVERTIME';

    const CONCEPT_EXTRA_DAY = 'EXTRA_DAY';

    const CONCEPT_PUNCTUALITY_BONUS = 'PUNCTUALITY_BONUS';

    const CONCEPT_HOLIDAY = 'HOLIDAY';

    const CONCEPT_OTHER = 'OTHER';

    protected $fillable = [
        'pay_period_employee_id',
        'date',
        'concept',
        'description',
        'amount',
        'minutes',
        'meta',
    ];

    protected $casts = [
        'date' => 'date',
        'amount' => 'decimal:2',
        'minutes' => 'integer',
        'meta' => 'array',
    ];

    public function payPeriodEmployee(): BelongsTo
    {
        return $this->belongsTo(PayPeriodEmployee::class);
    }
}
