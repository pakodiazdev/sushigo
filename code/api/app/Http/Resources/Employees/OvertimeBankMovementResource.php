<?php

namespace App\Http\Resources\Employees;

use App\Http\Resources\BaseResource;
use App\Models\OvertimeBankMovement;

/**
 * @mixin OvertimeBankMovement
 */
class OvertimeBankMovementResource extends BaseResource
{
    public function toArray($request): array
    {
        return [
            'id' => $this->public_id,
            'date' => $this->date->toDateString(),
            'movement_type' => $this->movement_type->value,
            'origin' => $this->origin->value,
            'minutes' => $this->minutes,
            'valuation_method' => $this->valuation_method?->value,
            'applied_rate' => $this->applied_rate !== null ? (float) $this->applied_rate : null,
            'amount' => $this->amount !== null ? (float) $this->amount : null,
            'authorized_by' => $this->authorizedBy?->name,
            'authorized_at' => $this->authorized_at?->toIso8601String(),
            'reason' => $this->reason,
        ];
    }
}
