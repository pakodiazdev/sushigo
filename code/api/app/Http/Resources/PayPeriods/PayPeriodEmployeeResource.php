<?php

namespace App\Http\Resources\PayPeriods;

use App\Http\Resources\BaseResource;
use App\Models\PayPeriodEmployee;

/**
 * @mixin PayPeriodEmployee
 *
 * @OA\Schema(
 *     schema="PayPeriodEmployeeResponse",
 *     title="Pay Period Employee Response",
 *
 *     @OA\Property(property="employee", type="object",
 *         @OA\Property(property="id", type="string"),
 *         @OA\Property(property="first_name", type="string"),
 *         @OA\Property(property="last_name", type="string"),
 *         @OA\Property(property="code", type="string", nullable=true)
 *     ),
 *     @OA\Property(property="base_pay", type="number", format="float"),
 *     @OA\Property(property="late_deductions", type="number", format="float"),
 *     @OA\Property(property="unpaid_leave_deductions", type="number", format="float"),
 *     @OA\Property(property="overtime_pay", type="number", format="float"),
 *     @OA\Property(property="extra_day_pay", type="number", format="float"),
 *     @OA\Property(property="punctuality_bonus", type="number", format="float"),
 *     @OA\Property(property="holiday_pay", type="number", format="float"),
 *     @OA\Property(property="other_adjustments", type="number", format="float"),
 *     @OA\Property(property="total_pay", type="number", format="float"),
 *     @OA\Property(property="free_hours_earned", type="number", format="float"),
 *     @OA\Property(property="pay_period_lines", type="array", @OA\Items(ref="#/components/schemas/PayPeriodLineResponse"))
 * )
 */
class PayPeriodEmployeeResource extends BaseResource
{
    public function toArray($request): array
    {
        return [
            'employee' => [
                'id' => $this->employee->public_id,
                'first_name' => $this->employee->first_name,
                'last_name' => $this->employee->last_name,
                'code' => $this->employee->code,
            ],
            'base_pay' => (float) $this->base_pay,
            'late_deductions' => (float) $this->late_deductions,
            'unpaid_leave_deductions' => (float) $this->unpaid_leave_deductions,
            'overtime_pay' => (float) $this->overtime_pay,
            'extra_day_pay' => (float) $this->extra_day_pay,
            'punctuality_bonus' => (float) $this->punctuality_bonus,
            'holiday_pay' => (float) $this->holiday_pay,
            'other_adjustments' => (float) $this->other_adjustments,
            'total_pay' => (float) $this->total_pay,
            'free_hours_earned' => (float) $this->free_hours_earned,
            'pay_period_lines' => PayPeriodLineResource::collection($this->lines)->resolve(),
        ];
    }
}
