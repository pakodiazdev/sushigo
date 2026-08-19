<?php

namespace App\Models;

use App\Support\Traits\HasPublicId;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class InventoryCategory extends Model
{
    use HasFactory, HasPublicId, SoftDeletes;

    protected $fillable = [
        'name',
        'position',
        'is_active',
    ];

    protected $casts = [
        'position' => 'integer',
        'is_active' => 'boolean',
    ];

    public function items(): HasMany
    {
        return $this->hasMany(Item::class);
    }

    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    /**
     * Whether any non-deleted, active Product (Item type=PRODUCTO) still
     * references this category — blocks deactivation per
     * doc/architecture/product-catalog/product-catalog-architecture.en.md §3.3.
     */
    public function hasActiveProducts(): bool
    {
        return $this->activeProductsCount() > 0;
    }

    /**
     * Count backing hasActiveProducts() — surfaced directly in the
     * deactivate/delete-blocked error messages so the caller (and the
     * frontend built on top of it) knows exactly how many Products to
     * reassign/deactivate first, not just that some unspecified number
     * exist.
     */
    public function activeProductsCount(): int
    {
        return $this->items()
            ->where('type', Item::TYPE_PRODUCTO)
            ->where('is_active', true)
            ->count();
    }
}
