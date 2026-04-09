<?php

namespace App\Http\Resources\Leave;

use App\Http\Resources\BaseResource;
use App\Models\LeaveType;

/**
 * @mixin LeaveType
 */
class LeaveTypeResource extends BaseResource
{
    public function toArray($request): array
    {
        return [
            'id' => $this->id,
            'code' => $this->code,
            'name' => $this->name,
            'calculation_mode' => $this->calculation_mode->value,
            'default_pay_percentage' => (float) $this->default_pay_percentage,
            'default_rest_day_factor' => $this->default_rest_day_factor->value,
            'counts_for_bonus' => (bool) $this->counts_for_bonus,
        ];
    }
}
