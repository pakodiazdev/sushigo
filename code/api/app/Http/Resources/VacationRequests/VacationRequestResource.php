<?php

namespace App\Http\Resources\VacationRequests;

use App\Http\Resources\BaseResource;
use App\Models\VacationRequest;

/**
 * @mixin VacationRequest
 *
 * @OA\Schema(
 *     schema="VacationRequestResponse",
 *     title="Vacation Request Response",
 *
 *     @OA\Property(property="id", type="string", example="01JKXYZ1234567890ABCDEFGH", description="ULID public identifier"),
 *     @OA\Property(property="employee_id", type="string", example="01JKABC0987654321ZYXWVUTS", description="Employee public_id (ULID)"),
 *     @OA\Property(property="start_date", type="string", format="date", example="2026-08-01"),
 *     @OA\Property(property="end_date", type="string", format="date", example="2026-08-05"),
 *     @OA\Property(property="days_count", type="integer", example=5),
 *     @OA\Property(property="status", type="string", enum={"PENDING", "APPROVED", "REJECTED", "CANCELLED"}, example="PENDING"),
 *     @OA\Property(property="requested_by", type="string", example="Admin User"),
 *     @OA\Property(property="approved_by", type="string", nullable=true, example="Admin User"),
 *     @OA\Property(property="approved_at", type="string", format="date-time", nullable=true, example="2026-08-01T10:00:00+00:00"),
 *     @OA\Property(property="notes", type="string", nullable=true, example="Vacaciones familiares"),
 *     @OA\Property(property="created_at", type="string", format="date-time", example="2026-08-01T08:00:00+00:00")
 * )
 */
class VacationRequestResource extends BaseResource
{
    public function toArray($request): array
    {
        return [
            'id' => $this->public_id,
            'employee_id' => $this->employee->public_id,
            'start_date' => $this->start_date->toDateString(),
            'end_date' => $this->end_date->toDateString(),
            'days_count' => $this->days_count,
            'status' => $this->status->value,
            'requested_by' => $this->requestedBy->name,
            'approved_by' => $this->approvedBy?->name,
            'approved_at' => $this->approved_at?->toIso8601String(),
            'notes' => $this->notes,
            'created_at' => $this->created_at->toIso8601String(),
        ];
    }
}
