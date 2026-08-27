<?php

namespace App\Models;

use App\Support\Traits\HasPublicId;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

/**
 * A per-(Inventory Location, Variant) replenishment policy (#439). Replaces the
 * former global ItemVariant.min_stock / max_stock columns.
 */
class VariantLocationReplenishmentPolicy extends Model
{
    use HasFactory, HasPublicId, SoftDeletes;

    protected $fillable = [
        'inventory_location_id',
        'item_variant_id',
        'min_stock',
        'max_stock',
        'notes',
        'meta',
    ];

    protected $casts = [
        'min_stock' => 'decimal:4',
        'max_stock' => 'decimal:4',
        'meta' => 'array',
    ];

    public function inventoryLocation(): BelongsTo
    {
        return $this->belongsTo(InventoryLocation::class);
    }

    public function itemVariant(): BelongsTo
    {
        return $this->belongsTo(ItemVariant::class);
    }
}
