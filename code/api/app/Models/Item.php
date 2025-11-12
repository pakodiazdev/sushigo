<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\MorphMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Item extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'sku',
        'name',
        'description',
        'type',
        'is_stocked',
        'is_perishable',
        'is_manufactured',
        'is_active',
        'meta',
    ];

    protected $casts = [
        'is_stocked' => 'boolean',
        'is_perishable' => 'boolean',
        'is_manufactured' => 'boolean',
        'is_active' => 'boolean',
        'meta' => 'array',
    ];

    // Type constants
    public const TYPE_INSUMO = 'INSUMO';
    public const TYPE_PRODUCTO = 'PRODUCTO';
    public const TYPE_ACTIVO = 'ACTIVO';

    /**
     * Get all variants for this item
     */
    public function variants(): HasMany
    {
        return $this->hasMany(ItemVariant::class);
    }

    /**
     * Get active variants
     */
    public function activeVariants(): HasMany
    {
        return $this->variants()->where('is_active', true);
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
     * Scope to filter active items
     */
    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    /**
     * Scope to filter by type
     */
    public function scopeType($query, string $type)
    {
        return $query->where('type', $type);
    }

    /**
     * Scope to filter stocked items
     */
    public function scopeStocked($query)
    {
        return $query->where('is_stocked', true);
    }

    /**
     * Scope to filter perishable items
     */
    public function scopePerishable($query)
    {
        return $query->where('is_perishable', true);
    }

    /**
     * Check if item is an input/supply
     */
    public function isInsumo(): bool
    {
        return $this->type === self::TYPE_INSUMO;
    }

    /**
     * Check if item is a finished product
     */
    public function isProducto(): bool
    {
        return $this->type === self::TYPE_PRODUCTO;
    }

    /**
     * Check if item is manufactured/prepared in-house
     */
    public function isManufactured(): bool
    {
        return $this->is_manufactured === true;
    }

    /**
     * Check if item is purchased for resale
     */
    public function isResale(): bool
    {
        return $this->is_manufactured === false;
    }

    /**
     * Check if item is an asset
     */
    public function isActivo(): bool
    {
        return $this->type === self::TYPE_ACTIVO;
    }
}
