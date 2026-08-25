<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ReceiptLine extends Model
{
    protected $fillable = [
        'receipt_id',
        'variant_purchase_presentation_id',
        'supplier_offering_id',
        'ordered_packages',
        'received_packages',
        'bonus_packages',
        'presentation_factor',
        'gross_amount',
        'discounts',
        'allocated_expenses',
        'non_recoverable_taxes',
        'net_acquisition_amount',
        'base_units_received',
        'effective_unit_cost',
        'meta',
    ];

    protected $casts = [
        'ordered_packages' => 'decimal:4',
        'received_packages' => 'decimal:4',
        'bonus_packages' => 'decimal:4',
        'presentation_factor' => 'decimal:6',
        'gross_amount' => 'decimal:4',
        'discounts' => 'decimal:4',
        'allocated_expenses' => 'decimal:4',
        'non_recoverable_taxes' => 'decimal:4',
        'net_acquisition_amount' => 'decimal:4',
        'base_units_received' => 'decimal:4',
        'effective_unit_cost' => 'decimal:4',
        'meta' => 'array',
    ];

    public function receipt(): BelongsTo
    {
        return $this->belongsTo(Receipt::class);
    }

    public function presentation(): BelongsTo
    {
        return $this->belongsTo(VariantPurchasePresentation::class, 'variant_purchase_presentation_id')->withTrashed();
    }

    public function supplierOffering(): BelongsTo
    {
        return $this->belongsTo(SupplierOffering::class)->withTrashed();
    }
}
