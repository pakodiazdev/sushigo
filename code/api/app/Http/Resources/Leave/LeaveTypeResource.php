<?php

namespace App\Http\Resources\Leave;

use App\Http\Resources\BaseResource;
use App\Models\LeaveType;

/**
 * @mixin LeaveType
 *
 * @OA\Schema(
 *     schema="LeaveTypeResponse",
 *     title="Leave Type Response",
 *
 *     @OA\Property(property="id", type="integer", example=1),
 *     @OA\Property(property="code", type="string", example="VACATION"),
 *     @OA\Property(property="name", type="string", example="Vacaciones"),
 *     @OA\Property(property="calculation_mode", type="string", enum={"FULL_DAY", "PROPORTIONAL_HOURS"}, example="FULL_DAY"),
 *     @OA\Property(property="default_pay_percentage", type="number", format="float", example=100.0),
 *     @OA\Property(property="default_rest_day_factor", type="string", enum={"FULL", "PROPORTIONAL", "NONE"}, example="FULL"),
 *     @OA\Property(property="counts_for_bonus", type="boolean", example=true)
 * )
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
