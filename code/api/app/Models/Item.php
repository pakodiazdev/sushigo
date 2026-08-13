<?php

namespace App\Models;

use App\Contracts\AuthorizesMediaOwnership;
use App\Models\Concerns\HasMediaGallery;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Item extends Model implements AuthorizesMediaOwnership
{
    use HasFactory, HasMediaGallery, SoftDeletes;

    protected $fillable = [
        'sku',
        'name',
        'description',
        'type',
        'is_stocked',
        'is_perishable',
        'is_active',
        'meta',
    ];

    protected $casts = [
        'is_stocked' => 'boolean',
        'is_perishable' => 'boolean',
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
     * Check if item is an asset
     */
    public function isActivo(): bool
    {
        return $this->type === self::TYPE_ACTIVO;
    }

    /**
     * Gate media changes (attach/reorder/delete) on a dedicated permission,
     * not items.update — that's also the guard for PUT /items/{id} and
     * PUT /item-variants/{id}, which accept name, sale_price, min_stock,
     * etc. Reusing it here would let anyone granted "manage this item's
     * photos" also silently edit catalog data and pricing. Not
     * ItemPolicy::update() either — even now that it enforces items.update
     * (see #400) — since that permission is still the catalog/pricing one,
     * not this narrower media-only permission.
     */
    public function userCanManageMedia(User $user): bool
    {
        return $user->can('items.manage-media');
    }
}
