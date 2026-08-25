<?php

declare(strict_types=1);

namespace App\Http\Resources\Inventory\Supplier;

use App\Http\Resources\BaseResource;
use App\Models\Supplier;

/** @mixin Supplier */
class SupplierResource extends BaseResource
{
    public function toArray($request): array
    {
        return [
            'id' => $this->public_id,
            'code' => $this->code,
            'name' => $this->name,
            'contact_name' => $this->contact_name,
            'email' => $this->email,
            'phone' => $this->phone,
            'is_active' => $this->is_active,
            'offerings_count' => $this->whenCounted('offerings'),
            'created_at' => $this->created_at?->toIso8601String(),
            'updated_at' => $this->updated_at?->toIso8601String(),
        ];
    }
}
