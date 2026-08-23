<?php

namespace App\Http\Requests\Concerns;

use App\Models\InventoryLocation;
use App\Models\ItemVariant;
use App\Models\UnitOfMeasure;

trait ResolvesStockReferenceIds
{
    use ResolvesPublicIdReferences;

    public function inventoryLocationId(): int
    {
        return $this->resolvePublicId(InventoryLocation::class, 'inventory_location_id');
    }

    public function itemVariantId(): int
    {
        return $this->resolvePublicId(ItemVariant::class, 'item_variant_id');
    }

    public function uomId(): int
    {
        return $this->resolvePublicId(UnitOfMeasure::class, 'uom_id');
    }
}
