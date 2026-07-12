<?php

namespace App\Http\Resources\AuditLogs;

use App\Http\Resources\BaseResource;
use App\Models\AttendanceAuditLog;

/**
 * @mixin AttendanceAuditLog
 *
 * @OA\Schema(
 *     schema="AuditLogResponse",
 *     title="Audit Log Response",
 *
 *     @OA\Property(property="id", type="integer", example=42),
 *     @OA\Property(property="auditable_type", type="string", example="App\\Models\\Attendance"),
 *     @OA\Property(property="auditable_id", type="string", nullable=true, example="01JKXYZ1234567890ABCDEFGH", description="Public ID (ULID) of the audited record"),
 *     @OA\Property(property="action", type="string", enum={"CREATE", "UPDATE", "DELETE"}, example="UPDATE"),
 *     @OA\Property(property="old_values", type="object", nullable=true),
 *     @OA\Property(property="new_values", type="object", nullable=true),
 *     @OA\Property(property="user", type="string", nullable=true, example="Ana García"),
 *     @OA\Property(property="reason", type="string", nullable=true, example="Corrección de horario"),
 *     @OA\Property(property="created_at", type="string", format="date-time", example="2026-07-03T15:05:30+00:00")
 * )
 */
class AuditLogResource extends BaseResource
{
    public function toArray($request): array
    {
        return [
            'id' => $this->id,
            'auditable_type' => $this->auditable_type,
            'auditable_id' => $this->auditable?->public_id,
            'action' => $this->action->value,
            'old_values' => $this->old_values,
            'new_values' => $this->new_values,
            'user' => $this->user?->name,
            'reason' => $this->reason,
            'created_at' => $this->created_at->toIso8601String(),
        ];
    }
}
