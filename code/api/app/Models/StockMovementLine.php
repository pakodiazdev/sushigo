<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class StockMovementLine extends Model
{
    protected $fillable = [
        'stock_movement_id',
        'item_variant_id',
        'uom_id',
        'qty',
        'base_qty',
        'conversion_factor',
        'unit_cost',
        'line_total',
        'sale_price',
        'sale_total',
        'profit_margin',
        'profit_total',
        'meta',
    ];

    protected $casts = [
        'qty' => 'decimal:4',
        'base_qty' => 'decimal:4',
        'conversion_factor' => 'decimal:6',
        'unit_cost' => 'decimal:4',
        'line_total' => 'decimal:4',
        'sale_price' => 'decimal:4',
        'sale_total' => 'decimal:4',
        'profit_margin' => 'decimal:4',
        'profit_total' => 'decimal:4',
        'meta' => 'array',
    ];

    /**
     * Get the stock movement
     */
    public function stockMovement(): BelongsTo
    {
        return $this->belongsTo(StockMovement::class);
    }

    /**
     * Get the item variant
     */
    public function itemVariant(): BelongsTo
    {
        return $this->belongsTo(ItemVariant::class);
    }

    /**
     * Get the unit of measure used in transaction
     */
    public function unitOfMeasure(): BelongsTo
    {
        return $this->belongsTo(UnitOfMeasure::class, 'uom_id');
    }

    /**
     * Calculate line total from qty and unit cost
     */
    public function calculateLineTotal(): float
    {
        return $this->qty * ($this->unit_cost ?? 0);
    }
}
