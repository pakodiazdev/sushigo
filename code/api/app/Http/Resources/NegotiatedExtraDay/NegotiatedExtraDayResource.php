<?php

namespace App\Http\Resources\NegotiatedExtraDay;

use App\Http\Resources\BaseResource;
use App\Models\NegotiatedExtraDay;

/**
 * @mixin NegotiatedExtraDay
 *
 * @OA\Schema(
 *     schema="NegotiatedExtraDayResponse",
 *     title="Negotiated Extra Day Response",
 *
 *     @OA\Property(property="id", type="string", example="01JKXYZ1234567890ABCDEFGH", description="ULID public identifier"),
 *     @OA\Property(property="employee_id", type="string", example="01JKABC0987654321ZYXWVUTS", description="Employee public_id (ULID)"),
 *     @OA\Property(property="branch_id", type="integer", example=1, description="Branch ID"),
 *     @OA\Property(property="date", type="string", format="date", example="2026-04-20"),
 *     @OA\Property(property="agreed_daily_wage", type="number", format="float", example=500.0000),
 *     @OA\Property(property="prima_percent", type="number", format="float", example=100.0000),
 *     @OA\Property(property="prima_amount", type="number", format="float", example=500.0000),
 *     @OA\Property(property="approved_by", type="string", example="Admin User", description="Approver user name"),
 *     @OA\Property(property="status", type="string", example="APPROVED"),
 *     @OA\Property(property="notes", type="string", nullable=true, example="Acuerdo especial"),
 *     @OA\Property(property="created_at", type="string", format="date-time", example="2026-04-20T10:00:00+00:00")
 * )
 */
class NegotiatedExtraDayResource extends BaseResource
{
    public function toArray($request): array
    {
        return [
            'id' => $this->public_id,
            'employee_id' => $this->employee->public_id,
            'branch_id' => $this->branch_id,
            'date' => $this->date->toDateString(),
            'agreed_daily_wage' => (float) $this->agreed_daily_wage,
            'prima_percent' => (float) $this->prima_percent,
            'prima_amount' => (float) $this->prima_amount,
            'approved_by' => $this->approvedBy->name,
            'status' => $this->status,
            'notes' => $this->notes,
            'created_at' => $this->created_at->toIso8601String(),
        ];
    }
}
