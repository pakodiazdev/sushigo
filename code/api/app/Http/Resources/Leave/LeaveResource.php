<?php

namespace App\Http\Resources\Leave;

use App\Http\Resources\BaseResource;
use App\Models\Leave;

/**
 * @mixin Leave
 *
 * @OA\Schema(
 *     schema="LeaveResponse",
 *     title="Leave Response",
 *
 *     @OA\Property(property="id", type="string", example="01JKXYZ1234567890ABCDEFGH", description="ULID public identifier"),
 *     @OA\Property(property="employee_id", type="string", example="01JKABC0987654321ZYXWVUTS", description="Employee public_id (ULID)"),
 *     @OA\Property(property="leave_type", type="object",
 *         @OA\Property(property="id", type="integer", example=1),
 *         @OA\Property(property="code", type="string", example="VACATION"),
 *         @OA\Property(property="name", type="string", example="Vacaciones"),
 *         @OA\Property(property="calculation_mode", type="string", enum={"FULL_DAY", "PROPORTIONAL_HOURS"}, example="FULL_DAY")
 *     ),
 *     @OA\Property(property="start_date", type="string", format="date", example="2026-03-01", description="Derived MIN of dates — kept for range display/filtering"),
 *     @OA\Property(property="end_date", type="string", format="date", example="2026-03-03", description="Derived MAX of dates — kept for range display/filtering"),
 *     @OA\Property(property="dates", type="array", @OA\Items(type="string", format="date"), example={"2026-03-01", "2026-03-03"}, description="The exact individual days this leave covers"),
 *     @OA\Property(property="resolved_pay_percentage", type="number", format="float", example=100.0),
 *     @OA\Property(property="resolved_rest_day_factor", type="string", enum={"FULL", "PROPORTIONAL", "NONE"}, example="FULL"),
 *     @OA\Property(property="time_mode", type="string", nullable=true, enum={"SCHEDULED", "OPEN_ENDED"}, example=null),
 *     @OA\Property(property="scheduled_start_time", type="string", nullable=true, example="09:00"),
 *     @OA\Property(property="scheduled_end_time", type="string", nullable=true, example="13:00"),
 *     @OA\Property(property="actual_start_time", type="string", nullable=true, example="09:05"),
 *     @OA\Property(property="actual_end_time", type="string", nullable=true, example="12:55"),
 *     @OA\Property(property="actual_duration_minutes", type="integer", nullable=true, example=230),
 *     @OA\Property(property="computed_duration_minutes", type="integer", nullable=true, example=240),
 *     @OA\Property(property="status", type="string", enum={"APPROVED", "PENDING", "REJECTED", "CANCELLED"}, example="APPROVED"),
 *     @OA\Property(property="requested_by", type="string", example="Admin User"),
 *     @OA\Property(property="approved_by", type="string", nullable=true, example="Admin User"),
 *     @OA\Property(property="approved_at", type="string", format="date-time", nullable=true, example="2026-03-01T10:00:00+00:00"),
 *     @OA\Property(property="notes", type="string", nullable=true, example="Vacaciones familiares"),
 *     @OA\Property(property="created_at", type="string", format="date-time", example="2026-03-01T08:00:00+00:00")
 * )
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
            'dates' => $this->dates->pluck('date')->map(fn ($date) => $date->toDateString())->values(),
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
