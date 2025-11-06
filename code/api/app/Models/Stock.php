<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Stock extends Model
{
    protected $table = 'stock';

    protected $fillable = [
        'inventory_location_id',
        'item_variant_id',
        'on_hand',
        'reserved',
        'meta',
    ];

    protected $casts = [
        'on_hand' => 'decimal:4',
        'reserved' => 'decimal:4',
        'available' => 'decimal:4',
        'meta' => 'array',
    ];

    // available is a computed column in the database

    /**
     * Get the inventory location
     */
    public function inventoryLocation(): BelongsTo
    {
        return $this->belongsTo(InventoryLocation::class);
    }

    /**
     * Get the item variant
     */
    public function itemVariant(): BelongsTo
    {
        return $this->belongsTo(ItemVariant::class);
    }

    /**
     * Scope to filter positive stock
     */
    public function scopePositive($query)
    {
        return $query->where('on_hand', '>', 0);
    }

    /**
     * Scope to filter available stock
     */
    public function scopeAvailable($query)
    {
        return $query->whereRaw('on_hand > reserved');
    }

    /**
     * Increase on_hand quantity
     */
    public function increaseOnHand(float $qty): void
    {
        $this->increment('on_hand', $qty);
    }

    /**
     * Decrease on_hand quantity
     */
    public function decreaseOnHand(float $qty): void
    {
        $this->decrement('on_hand', $qty);
    }

    /**
     * Reserve quantity
     */
    public function reserve(float $qty): void
    {
        $this->increment('reserved', $qty);
    }

    /**
     * Release reserved quantity
     */
    public function release(float $qty): void
    {
        $this->decrement('reserved', $qty);
    }

    /**
     * Check if there's enough available stock
     */
    public function hasAvailable(float $qty): bool
    {
        return $this->available >= $qty;
    }
}
