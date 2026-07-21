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
 *     @OA\Property(property="user", type="object", description="Personal data owned by the linked User account — fields are null when has_user is false",
 *         @OA\Property(property="first_name", type="string", nullable=true, example="Juan"),
 *         @OA\Property(property="last_name", type="string", nullable=true, example="Perez"),
 *         @OA\Property(property="email", type="string", format="email", nullable=true, example="juan@sushigo.com"),
 *         @OA\Property(property="phone", type="string", nullable=true, example="5512345678"),
 *         @OA\Property(property="phone_country", type="string", nullable=true, example="+52")
 *     ),
 *     @OA\Property(property="roles", type="array", @OA\Items(type="string", enum={"manager", "cook", "kitchen-assistant", "delivery-driver", "acting-manager"}), example={"cook"}, description="Position roles"),
 *     @OA\Property(property="is_active", type="boolean", example=true),
 *     @OA\Property(property="attendance_exempt", type="boolean", example=false, description="True for roles (e.g. admin, super-admin) that do not check in/out — excluded from the attendance list"),
 *     @OA\Property(property="vacation_entitlement_rule_key", type="string", nullable=true, example="ContractualPolicy", description="null = inherits the tenant-wide vacation policy"),
 *     @OA\Property(property="vacation_entitlement_custom_table", type="array", nullable=true, @OA\Items(@OA\Property(property="years_from", type="integer"), @OA\Property(property="days", type="integer"))),
 *     @OA\Property(property="has_active_period", type="boolean", nullable=true, example=true, description="True when employee has at least one active employment period"),
 *     @OA\Property(property="has_user", type="boolean", example=true, description="Whether the employee has a linked user account"),
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
            'user' => [
                'first_name' => $this->user?->first_name,
                'last_name' => $this->user?->last_name,
                'email' => $this->user?->email,
                'phone' => $this->user?->phone,
                'phone_country' => $this->user?->phone_country,
            ],
            'roles' => $this->getPositionRoles(),
            'is_active' => $this->is_active,
            'attendance_exempt' => $this->attendance_exempt,
            'vacation_entitlement_rule_key' => $this->vacation_entitlement_rule_key,
            'vacation_entitlement_custom_table' => $this->vacation_entitlement_custom_table,
            'has_active_period' => $this->active_employment_periods_count !== null
                ? $this->active_employment_periods_count > 0
                : ($this->relationLoaded('employmentPeriods')
                    ? $this->employmentPeriods->contains('is_active', true)
                    : null),
            'has_user' => $this->user_id !== null,
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
