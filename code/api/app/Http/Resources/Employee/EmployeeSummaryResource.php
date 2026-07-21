<?php

namespace App\Http\Resources\Employee;

use App\Http\Resources\BaseResource;

/**
 * Compact employee representation for nesting inside other responses
 * (e.g. TodayAttendance rows).
 *
 * @OA\Schema(
 *     schema="EmployeeSummaryResponse",
 *     title="Employee Summary Response",
 *
 *     @OA\Property(property="id", type="string", example="01JKXYZ1234567890ABCDEFGH", description="ULID public identifier"),
 *     @OA\Property(property="code", type="string", example="EMP-001"),
 *     @OA\Property(property="first_name", type="string", example="Juan"),
 *     @OA\Property(property="last_name", type="string", example="Perez"),
 *     @OA\Property(property="roles", type="array", @OA\Items(type="string", enum={"manager", "cook", "kitchen-assistant", "delivery-driver", "acting-manager"}), example={"cook"}, description="Position roles"),
 *     @OA\Property(property="daily_wage", type="number", format="float", nullable=true, example=271.44, description="Computed daily wage (hourly_rate × weekly_scheduled_hours / 6). Null when no wage history is loaded.")
 * )
 */
class EmployeeSummaryResource extends BaseResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray($request): array
    {
        // Only compute when the relation was explicitly eager-loaded (e.g. TodayAttendanceController).
        // Falls back to null for contexts where wageHistories are not loaded, so the field is always
        // present in the JSON payload (never a MissingValue) regardless of the caller.
        $wage = $this->relationLoaded('wageHistories') ? $this->wageHistories->first() : null;

        return [
            'id' => $this->public_id,
            'code' => $this->code,
            'first_name' => $this->user?->first_name,
            'last_name' => $this->user?->last_name,
            'roles' => $this->getPositionRoles(),
            'daily_wage' => $wage
                ? round((float) $wage->hourly_rate * (float) $wage->weekly_scheduled_hours / 6, 2)
                : null,
        ];
    }
}
