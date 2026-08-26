<?php

namespace App\Models;

use App\Models\Concerns\HasMediaGallery;
use App\Support\Traits\HasPublicId;
use App\Support\Traits\SerializesPublicIdAsId;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class ItemVariant extends Model
{
    use HasFactory, HasMediaGallery, HasPublicId, SerializesPublicIdAsId, SoftDeletes;

    protected $fillable = [
        'item_id',
        'uom_id',
        'code',
        'barcode',
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
     * Get the commercial packaging presentations assigned to this variant
     */
    public function purchasePresentations(): HasMany
    {
        return $this->hasMany(VariantPurchasePresentation::class);
    }

    /**
     * Get the effective-dated price-list entries for this variant (#435).
     * Resolution against these — never this model's own sale_price — is the
     * authoritative source of a Variant's price. See PriceResolutionService.
     */
    public function prices(): HasMany
    {
        return $this->hasMany(VariantPrice::class);
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
}
