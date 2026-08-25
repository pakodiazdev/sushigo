<?php

namespace App\Models;

use App\Support\Traits\HasPublicId;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

class SupplierOffering extends Model
{
    use HasFactory, HasPublicId, SoftDeletes;

    protected $fillable = [
        'supplier_id',
        'variant_purchase_presentation_id',
        'supplier_code',
        'quoted_price',
        'currency',
        'valid_from',
        'valid_until',
        'minimum_order_quantity',
        'lead_time_days',
        'is_active',
    ];

    protected $casts = [
        'quoted_price' => 'decimal:4',
        'valid_from' => 'date',
        'valid_until' => 'date',
        'minimum_order_quantity' => 'decimal:4',
        'lead_time_days' => 'integer',
        'is_active' => 'boolean',
    ];

    public function supplier(): BelongsTo
    {
        return $this->belongsTo(Supplier::class)->withTrashed();
    }

    public function presentation(): BelongsTo
    {
        return $this->belongsTo(VariantPurchasePresentation::class, 'variant_purchase_presentation_id')->withTrashed();
    }

    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }
}
