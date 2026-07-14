<?php

namespace App\Http\Resources\PayPeriods;

use App\Http\Resources\BaseResource;
use App\Models\PayPeriod;

/**
 * @mixin PayPeriod
 *
 * @OA\Schema(
 *     schema="PayPeriodResponse",
 *     title="Pay Period Response",
 *
 *     @OA\Property(property="id", type="string", example="01JKXYZ1234567890ABCDEFGH"),
 *     @OA\Property(property="branch_id", type="integer", example=1),
 *     @OA\Property(property="period_start", type="string", format="date", example="2026-06-22"),
 *     @OA\Property(property="period_end", type="string", format="date", example="2026-06-28"),
 *     @OA\Property(property="status", type="string", enum={"OPEN", "CLOSED", "REOPENED"}, example="CLOSED"),
 *     @OA\Property(property="closed_by", type="string", nullable=true, example="Ana García"),
 *     @OA\Property(property="closed_at", type="string", format="date-time", nullable=true),
 *     @OA\Property(property="reopened_by", type="string", nullable=true),
 *     @OA\Property(property="reopened_at", type="string", format="date-time", nullable=true),
 *     @OA\Property(property="reopen_reason", type="string", nullable=true),
 *     @OA\Property(property="total_employees", type="integer", example=12),
 *     @OA\Property(property="employees", type="array", @OA\Items(ref="#/components/schemas/PayPeriodEmployeeResponse"))
 * )
 */
class PayPeriodResource extends BaseResource
{
    public function toArray($request): array
    {
        return [
            'id' => $this->public_id,
            'branch_id' => $this->branch_id,
            'period_start' => $this->period_start->toDateString(),
            'period_end' => $this->period_end->toDateString(),
            'status' => $this->status,
            'closed_by' => $this->closedBy?->name,
            'closed_at' => $this->closed_at?->toIso8601String(),
            'reopened_by' => $this->reopenedBy?->name,
            'reopened_at' => $this->reopened_at?->toIso8601String(),
            'reopen_reason' => $this->reopen_reason,
            // List context (ListPayPeriodsController) only withCount()s the relation, so
            // pay_period_employees_count is the source; show context (ShowPayPeriodController)
            // eager-loads the full relation, so counting it avoids a redundant count query.
            'total_employees' => $this->relationLoaded('payPeriodEmployees')
                ? $this->payPeriodEmployees->count()
                : $this->pay_period_employees_count,
            'employees' => $this->whenLoaded(
                'payPeriodEmployees',
                fn () => PayPeriodEmployeeResource::collection($this->payPeriodEmployees)->resolve()
            ),
        ];
    }
}
