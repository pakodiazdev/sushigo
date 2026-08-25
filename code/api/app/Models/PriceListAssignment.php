<?php

namespace App\Models;

use App\Support\Traits\HasPublicId;
use App\Support\Traits\SerializesPublicIdAsId;
use DateTimeInterface;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PriceListAssignment extends Model
{
    use HasFactory, HasPublicId, SerializesPublicIdAsId;

    protected $fillable = [
        'price_list_id',
        'branch_id',
        'operating_unit_id',
        'effective_from',
        'effective_to',
        'is_active',
    ];

    protected $casts = [
        'effective_from' => 'date',
        'effective_to' => 'date',
        'is_active' => 'boolean',
    ];

    public function priceList(): BelongsTo
    {
        return $this->belongsTo(PriceList::class);
    }

    public function branch(): BelongsTo
    {
        return $this->belongsTo(Branch::class);
    }

    public function operatingUnit(): BelongsTo
    {
        return $this->belongsTo(OperatingUnit::class);
    }

    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    /**
     * Whether this assignment's effective window contains the given date
     * (open-ended when effective_to is null).
     */
    public function coversDate(DateTimeInterface $date): bool
    {
        $from = $this->effective_from;
        $to = $this->effective_to;

        return $from->lessThanOrEqualTo($date) && ($to === null || $to->greaterThanOrEqualTo($date));
    }
}
