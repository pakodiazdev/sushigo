<?php

namespace App\Http\Resources\Employees;

use App\Http\Resources\BaseResource;
use App\Models\VacationEntitlement;

/**
 * @mixin VacationEntitlement
 */
class VacationEntitlementResource extends BaseResource
{
    public function toArray($request): array
    {
        return [
            'id' => $this->id,
            'year' => $this->year,
            'entitled_days' => $this->entitled_days,
            'used_days' => $this->used_days,
            'remaining_days' => $this->remainingDays(),
            'rule_key' => $this->rule_key,
        ];
    }
}
