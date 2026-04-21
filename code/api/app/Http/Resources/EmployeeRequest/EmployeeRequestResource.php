<?php

namespace App\Http\Resources\EmployeeRequest;

use App\Http\Resources\BaseResource;
use App\Models\EmployeeRequest;

/**
 * @mixin EmployeeRequest
 *
 * @OA\Schema(
 *     schema="EmployeeRequestResponse",
 *     title="Employee Request Response",
 *
 *     @OA\Property(property="id", type="string", example="01JKXYZ1234567890ABCDEFGH", description="ULID public identifier"),
 *     @OA\Property(property="employee_id", type="string", example="01JKABC0987654321ZYXWVUTS", description="Employee public_id (ULID)"),
 *     @OA\Property(property="type", type="string", enum={"EXTRA_DAY", "LEAVE", "VACATION", "SCHEDULE_CHANGE"}, example="EXTRA_DAY"),
 *     @OA\Property(property="status", type="string", enum={"PENDING", "APPROVED", "REJECTED"}, example="PENDING"),
 *     @OA\Property(property="payload", type="object"),
 *     @OA\Property(property="requestable", type="object", nullable=true,
 *        @OA\Property(property="id", type="integer", example=1),
 *        @OA\Property(property="type", type="string", example="App\\Models\\NegotiatedExtraDay")
 *     ),
 *     @OA\Property(property="requested_by", type="string", example="Admin User"),
 *     @OA\Property(property="approved_by", type="string", nullable=true, example="Manager User"),
 *     @OA\Property(property="approved_at", type="string", format="date-time", nullable=true, example="2026-04-21T15:05:30+00:00"),
 *     @OA\Property(property="notes", type="string", nullable=true, example="Aprobación manual"),
 *     @OA\Property(property="created_at", type="string", format="date-time", example="2026-04-21T14:00:00+00:00")
 * )
 */
class EmployeeRequestResource extends BaseResource
{
    public function toArray($request): array
    {
        return [
            'id' => $this->public_id,
            'employee_id' => $this->employee->public_id,
            'type' => $this->type->value,
            'status' => $this->status->value,
            'payload' => $this->payload,
            'requestable' => $this->requestable ? [
                'id' => $this->requestable->id,
                'type' => $this->requestable_type,
            ] : null,
            'requested_by' => $this->requestedBy->name,
            'approved_by' => $this->approvedBy?->name,
            'approved_at' => $this->approved_at?->toIso8601String(),
            'notes' => $this->notes,
            'created_at' => $this->created_at->toIso8601String(),
        ];
    }
}
