<?php

namespace App\Models;

use App\Support\Traits\HasPublicId;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class PurchasePresentationTemplate extends Model
{
    use HasFactory, HasPublicId, SoftDeletes;

    public const PACKAGE_TYPE_UNIT = 'UNIT';

    public const PACKAGE_TYPE_PACK = 'PACK';

    public const PACKAGE_TYPE_BOX = 'BOX';

    public const PACKAGE_TYPE_TRAY = 'TRAY';

    protected $fillable = [
        'code',
        'name',
        'package_type',
        'base_unit_quantity',
        'compatible_dimension_uom_id',
        'is_active',
    ];

    protected $casts = [
        'base_unit_quantity' => 'decimal:4',
        'is_active' => 'boolean',
    ];

    public function compatibleUom(): BelongsTo
    {
        return $this->belongsTo(UnitOfMeasure::class, 'compatible_dimension_uom_id');
    }

    public function variantPresentations(): HasMany
    {
        return $this->hasMany(VariantPurchasePresentation::class, 'template_id');
    }

    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    /**
     * Whether this template has ever been assigned to a Variant, past or
     * present — blocks hard-delete per
     * doc/architecture/product-catalog/product-catalog-architecture.en.md §3.3
     * ("Templates used by any assignment (past or present) are deactivated,
     * never deleted"). withTrashed() so a since-removed assignment still counts.
     */
    public function hasAnyAssignments(): bool
    {
        return $this->variantPresentations()->withTrashed()->exists();
    }
}
