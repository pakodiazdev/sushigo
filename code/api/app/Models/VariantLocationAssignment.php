<?php

namespace App\Models;

use App\Support\Traits\HasPublicId;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

/**
 * States that a Variant is actively managed at an Inventory Location (#569),
 * independently of its physical `Stock` balance and of any optional
 * `VariantLocationReplenishmentPolicy`. It never carries a quantity or an
 * acquisition cost.
 *
 * One live row exists per `(inventory_location_id, item_variant_id)` (partial
 * unique index `vla_one_assignment_per_pair`); soft deletion keeps the audit
 * trail and allows a later reactivation without losing history.
 */
class VariantLocationAssignment extends Model
{
    use HasFactory, HasPublicId, SoftDeletes;

    protected $fillable = [
        'inventory_location_id',
        'item_variant_id',
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
