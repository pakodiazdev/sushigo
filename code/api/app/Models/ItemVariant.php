<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\MorphMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class ItemVariant extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'item_id',
        'uom_id',
        'code',
        'name',
        'description',
        'track_lot',
        'track_serial',
        'last_unit_cost',
        'avg_unit_cost',
        'sale_price',
        'min_stock',
        'max_stock',
        'is_active',
        'meta',
    ];

    protected $casts = [
        'track_lot' => 'boolean',
        'track_serial' => 'boolean',
        'last_unit_cost' => 'decimal:4',
        'avg_unit_cost' => 'decimal:4',
        'sale_price' => 'decimal:4',
        'min_stock' => 'decimal:4',
        'max_stock' => 'decimal:4',
        'is_active' => 'boolean',
        'meta' => 'array',
    ];

    /**
     * Get the item that owns this variant
     */
    public function item(): BelongsTo
    {
        return $this->belongsTo(Item::class);
    }

    /**
     * Get the base unit of measure
     */
    public function unitOfMeasure(): BelongsTo
    {
        return $this->belongsTo(UnitOfMeasure::class, 'uom_id');
    }

    /**
     * Get all stock records for this variant
     */
    public function stock(): HasMany
    {
        return $this->hasMany(Stock::class);
    }

    /**
     * Get stock movements for this variant
     */
    public function stockMovements(): HasMany
    {
        return $this->hasMany(StockMovement::class);
    }

    /**
     * Get media attachments (polymorphic)
     */
    public function mediaAttachments(): MorphMany
    {
        return $this->morphMany(MediaAttachment::class, 'attachable');
    }

    /**
     * Get primary media gallery
     */
    public function primaryMediaGallery()
    {
        return $this->mediaAttachments()
            ->where('is_primary', true)
            ->with('mediaGallery')
            ->first()
            ?->mediaGallery;
    }

    /**
     * Scope to filter active variants
     */
    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    /**
     * Scope to filter variants needing restocking
     */
    public function scopeLowStock($query)
    {
        return $query->whereHas('stock', function ($q) {
            $q->whereRaw('on_hand <= min_stock');
        });
    }

    /**
     * Get total available stock across all locations
     */
    public function getTotalAvailableAttribute(): float
    {
        return $this->stock()->sum('available');
    }

    /**
     * Get total on hand across all locations
     */
    public function getTotalOnHandAttribute(): float
    {
        return $this->stock()->sum('on_hand');
    }

    /**
     * Update the last unit cost (on new receipt)
     */
    public function updateLastUnitCost(float $cost): void
    {
        $this->update(['last_unit_cost' => $cost]);
    }

    /**
     * Update the weighted average cost
     */
    public function updateAverageUnitCost(float $newQty, float $newCost): void
    {
        $currentQty = $this->total_on_hand;
        $currentAvg = $this->avg_unit_cost;

        if ($currentQty + $newQty == 0) {
            return;
        }

        $newAvg = (($currentQty * $currentAvg) + ($newQty * $newCost)) / ($currentQty + $newQty);
        $this->update(['avg_unit_cost' => $newAvg]);
    }
}
