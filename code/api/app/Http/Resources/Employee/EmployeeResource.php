<?php

namespace App\Http\Resources\Employee;

use App\Http\Resources\BaseResource;

/**
 * @OA\Schema(
 *     schema="EmployeeResponse",
 *     title="Employee Response",
 *
 *     @OA\Property(property="id", type="string", example="01JKXYZ1234567890ABCDEFGH", description="ULID public identifier"),
 *     @OA\Property(property="code", type="string", example="EMP-001"),
 *     @OA\Property(property="first_name", type="string", example="Juan"),
 *     @OA\Property(property="last_name", type="string", example="Perez"),
 *     @OA\Property(property="roles", type="array", @OA\Items(type="string", enum={"manager", "cook", "kitchen-assistant", "delivery-driver", "acting-manager"}), example={"cook"}, description="Position roles"),
 *     @OA\Property(property="is_active", type="boolean", example=true),
 *     @OA\Property(property="has_active_period", type="boolean", nullable=true, example=true, description="True when employee has at least one active employment period"),
 *     @OA\Property(property="email", type="string", format="email", nullable=true, example="juan@sushigo.com"),
 *     @OA\Property(property="phone", type="string", nullable=true, example="5512345678"),
 *     @OA\Property(property="phone_country", type="string", nullable=true, example="+52"),
 *     @OA\Property(property="meta", type="object", nullable=true),
 *     @OA\Property(property="created_at", type="string", format="date-time", example="2026-02-09T00:00:00.000000Z"),
 *     @OA\Property(property="updated_at", type="string", format="date-time", example="2026-02-09T00:00:00.000000Z"),
 *     @OA\Property(property="employment_periods", type="array", nullable=true,
 *
 *         @OA\Items(type="object",
 *
 *             @OA\Property(property="id", type="string"),
 *             @OA\Property(property="branch_id", type="integer"),
 *             @OA\Property(property="branch_name", type="string", nullable=true),
 *             @OA\Property(property="start_date", type="string", format="date"),
 *             @OA\Property(property="end_date", type="string", format="date", nullable=true),
 *             @OA\Property(property="termination_reason", type="string", nullable=true),
 *             @OA\Property(property="is_active", type="boolean")
 *         )
 *     )
 * )
 */
class EmployeeResource extends BaseResource
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
            'is_active' => $this->is_active,
            'has_active_period' => $this->active_employment_periods_count !== null
                ? $this->active_employment_periods_count > 0
                : ($this->relationLoaded('employmentPeriods')
                    ? $this->employmentPeriods->contains('is_active', true)
                    : null),
            'email' => $this->user?->email,
            'phone' => $this->user?->phone,
            'phone_country' => $this->user?->phone_country,
            'meta' => $this->meta,
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
            'employment_periods' => $this->relationLoaded('employmentPeriods')
                ? $this->employmentPeriods->loadMissing('branch')->map(fn ($p) => [
                    'id' => $p->public_id,
                    'branch_id' => $p->branch_id,
                    'branch_name' => $p->branch?->name,
                    'start_date' => $p->start_date?->toDateString(),
                    'end_date' => $p->end_date?->toDateString(),
                    'termination_reason' => $p->termination_reason,
                    'is_active' => $p->is_active,
                ])->toArray()
                : null,
        ];
    }
}
