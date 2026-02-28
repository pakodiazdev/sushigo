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
 *     @OA\Property(property="roles", type="array", @OA\Items(type="string", enum={"manager", "cook", "kitchen-assistant", "delivery-driver", "acting-manager"}), example={"cook"}, description="Position roles")
 * )
 */
class EmployeeSummaryResource extends BaseResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray($request): array
    {
        return [
            'id' => $this->public_id,
            'code' => $this->code,
            'first_name' => $this->first_name,
            'last_name' => $this->last_name,
            'roles' => $this->getPositionRoles(),
        ];
    }
}
