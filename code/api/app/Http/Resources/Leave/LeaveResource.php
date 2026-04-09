<?php

namespace App\Http\Resources\Leave;

use App\Http\Resources\BaseResource;
use App\Models\Leave;

/**
 * @mixin Leave
 */
class LeaveResource extends BaseResource
{
    public function toArray($request): array
    {
        return [
            'id' => $this->public_id,
            'employee_id' => $this->employee->public_id,
            'leave_type' => [
                'id' => $this->leaveType->id,
                'code' => $this->leaveType->code,
                'name' => $this->leaveType->name,
                'calculation_mode' => $this->leaveType->calculation_mode->value,
            ],
            'start_date' => $this->start_date->toDateString(),
            'end_date' => $this->end_date->toDateString(),
            'resolved_pay_percentage' => (float) $this->resolvedPayPercentage(),
            'resolved_rest_day_factor' => $this->resolvedRestDayFactor()->value,
            'time_mode' => $this->time_mode?->value,
            'scheduled_start_time' => $this->scheduled_start_time,
            'scheduled_end_time' => $this->scheduled_end_time,
            'actual_start_time' => $this->actual_start_time,
            'actual_end_time' => $this->actual_end_time,
            'actual_duration_minutes' => $this->actual_duration_minutes,
            'computed_duration_minutes' => $this->computedDurationMinutes(),
            'status' => $this->status->value,
            'requested_by' => $this->requestedBy->name,
            'approved_by' => $this->approvedBy?->name,
            'approved_at' => $this->approved_at?->toIso8601String(),
            'notes' => $this->notes,
            'created_at' => $this->created_at->toIso8601String(),
        ];
    }
}
