<?php

namespace App\Models;

use App\Support\Traits\HasPublicId;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * One moved Variant within a Stock Transfer (#573). It snapshots the entry UOM,
 * the entry quantity, the entry-to-base conversion factor, the resulting base
 * quantity, and — filled in at posting — the source Location weighted-average
 * cost used to blend the destination WAC.
 */
class StockTransferLine extends Model
{
    use HasPublicId;

    protected $fillable = [
        'stock_transfer_id',
        'item_variant_id',
        'entry_uom_id',
        'entry_quantity',
        'conversion_factor',
        'base_quantity',
        'source_unit_cost',
        'meta',
    ];

    protected $casts = [
        'entry_quantity' => 'decimal:4',
        'conversion_factor' => 'decimal:6',
        'base_quantity' => 'decimal:4',
        'source_unit_cost' => 'decimal:4',
        'meta' => 'array',
    ];

    public function transfer(): BelongsTo
    {
        return $this->belongsTo(StockTransfer::class, 'stock_transfer_id');
    }

    public function itemVariant(): BelongsTo
    {
        return $this->belongsTo(ItemVariant::class)->withTrashed();
    }

    public function entryUom(): BelongsTo
    {
        return $this->belongsTo(UnitOfMeasure::class, 'entry_uom_id');
    }
}
