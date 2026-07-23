<?php

namespace App\Http\Controllers\Api\V1\InventoryLocation\Concerns;

use App\Models\InventoryLocation;

trait FormatsInventoryLocation
{
    /**
     * @return array<string, mixed>
     */
    protected function baseLocationData(InventoryLocation $location): array
    {
        return [
            'id' => $location->id,
            'operating_unit_id' => $location->operating_unit_id,
            'name' => $location->name,
            'type' => $location->type,
            'priority' => $location->priority,
            'is_primary' => $location->is_primary,
            'is_active' => $location->is_active,
            'notes' => $location->notes,
            'operating_unit' => [
                'id' => $location->operatingUnit->id,
                'name' => $location->operatingUnit->name,
                'type' => $location->operatingUnit->type,
                'branch' => [
                    'id' => $location->operatingUnit->branch->id,
                    'code' => $location->operatingUnit->branch->code,
                    'name' => $location->operatingUnit->branch->name,
                ],
            ],
        ];
    }
}
