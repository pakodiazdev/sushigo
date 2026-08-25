<?php

namespace App\Models;

use App\Support\Traits\HasPublicId;
use App\Support\Traits\SerializesPublicIdAsId;
use DateTimeInterface;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

class VariantPrice extends Model
{
    use HasFactory, HasPublicId, SerializesPublicIdAsId, SoftDeletes;

    protected $fillable = [
        'item_variant_id',
        'price_list_id',
        'price',
        'effective_from',
        'effective_to',
        'is_active',
    ];

    protected $casts = [
        'price' => 'decimal:4',
        'effective_from' => 'date',
        'effective_to' => 'date',
        'is_active' => 'boolean',
    ];

    public function itemVariant(): BelongsTo
    {
        return $this->belongsTo(ItemVariant::class);
    }

    public function priceList(): BelongsTo
    {
        return $this->belongsTo(PriceList::class);
    }

    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    public function coversDate(DateTimeInterface $date): bool
    {
        $from = $this->effective_from;
        $to = $this->effective_to;

        return $from->lessThanOrEqualTo($date) && ($to === null || $to->greaterThanOrEqualTo($date));
    }
}
