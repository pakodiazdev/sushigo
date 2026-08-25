<?php

namespace App\Models;

use App\Support\Traits\HasPublicId;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class VariantPurchasePresentation extends Model
{
    use HasFactory, HasPublicId, SoftDeletes;

    protected $fillable = [
        'item_variant_id',
        'template_id',
        'package_barcode',
        'is_default',
        'is_active',
        'meta',
    ];

    protected $casts = [
        'is_default' => 'boolean',
        'is_active' => 'boolean',
        'meta' => 'array',
    ];

    public function itemVariant(): BelongsTo
    {
        return $this->belongsTo(ItemVariant::class);
    }

    public function template(): BelongsTo
    {
        // withTrashed(): a deactivated/soft-deleted template still has
        // historical FK integrity — see product-catalog-architecture.en.md §3.3.
        return $this->belongsTo(PurchasePresentationTemplate::class, 'template_id')->withTrashed();
    }

    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    public function supplierOfferings(): HasMany
    {
        return $this->hasMany(SupplierOffering::class);
    }
}
