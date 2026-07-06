<?php

namespace App\Http\Resources\Attendance;

use App\Http\Resources\BaseResource;

/**
 * @OA\Schema(
 *     schema="AttendanceResponse",
 *     title="Attendance Response",
 *
 *     @OA\Property(property="id", type="string", example="01JKXYZ1234567890ABCDEFGH", description="ULID public identifier"),
 *     @OA\Property(property="employee_id", type="string", example="01JKABC0987654321ZYXWVUTS", description="Employee public_id (ULID)"),
 *     @OA\Property(property="date", type="string", format="date", example="2026-02-23", description="Attendance date"),
 *     @OA\Property(property="check_in", type="string", format="date-time", nullable=true, example="2026-02-23T09:05:30+00:00"),
 *     @OA\Property(property="check_out", type="string", format="date-time", nullable=true, example="2026-02-23T17:02:00+00:00"),
 *     @OA\Property(property="lunch_start", type="string", format="date-time", nullable=true, example="2026-02-23T13:00:00+00:00"),
 *     @OA\Property(property="lunch_end", type="string", format="date-time", nullable=true, example="2026-02-23T14:05:00+00:00"),
 *     @OA\Property(property="entry_late_seconds", type="integer", example=330, description="Seconds late at entry (0 = on time)"),
 *     @OA\Property(property="entry_late_minutes", type="integer", example=5, description="Whole minutes late at entry"),
 *     @OA\Property(property="is_entry_deductible", type="boolean", example=false, description="True when entry tardiness exceeds 30 minutes (>1800 seconds)"),
 *     @OA\Property(property="lunch_late_seconds", type="integer", example=0),
 *     @OA\Property(property="lunch_late_minutes", type="integer", example=0),
 *     @OA\Property(property="is_lunch_deductible", type="boolean", example=false),
 *     @OA\Property(property="net_worked_minutes", type="integer", nullable=true, example=480),
 *     @OA\Property(property="overtime_minutes", type="integer", nullable=true, example=0),
 *     @OA\Property(property="overtime_authorized", type="boolean", example=false),
 *     @OA\Property(property="overtime_authorized_at", type="string", format="date-time", nullable=true, example="2026-02-23T17:10:00+00:00",
 *         description="Timestamp when the overtime decision was recorded (null = no decision yet)"),
 *     @OA\Property(property="overtime_valuation_method", type="string", enum={"LFT_PROPORTIONAL", "AGREED_RATE", "SALARY_FACTOR"}, nullable=true, example="AGREED_RATE"),
 *     @OA\Property(property="overtime_rate_applied", type="number", format="float", nullable=true, example=90.00,
 *         description="LFT tier factor, agreed hourly rate, or salary factor multiplier, depending on overtime_valuation_method"),
 *     @OA\Property(property="overtime_amount", type="number", format="float", nullable=true, example=45.00),
 *     @OA\Property(property="requires_overtime_decision", type="boolean", example=false,
 *         description="True when overtime_minutes > 0 and no decision has been recorded yet (overtime_authorized_at is null)"),
 *     @OA\Property(property="day_status", type="string", enum={"WORKED","DAY_OFF","LEAVE","VACATION","HOLIDAY","ABSENCE","EXTRA"}, example="WORKED"),
 *     @OA\Property(property="created_at", type="string", format="date-time", example="2026-02-23T09:05:45.000000Z"),
 *     @OA\Property(property="updated_at", type="string", format="date-time", example="2026-02-23T09:05:45.000000Z")
 * )
 */
class AttendanceResource extends BaseResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray($request): array
    {
        return [
            'id' => $this->public_id,
            'employee_id' => $this->employee?->public_id,
            'date' => $this->date?->toDateString(),
            'check_in' => $this->check_in?->toIso8601String(),
            'check_out' => $this->check_out?->toIso8601String(),
            'lunch_start' => $this->lunch_start?->toIso8601String(),
            'lunch_end' => $this->lunch_end?->toIso8601String(),
            'entry_late_seconds' => $this->entry_late_seconds ?? 0,
            'entry_late_minutes' => $this->entryLateMinutes(),
            'is_entry_deductible' => $this->isEntryLateDeductible(),
            'lunch_late_seconds' => $this->lunch_late_seconds ?? 0,
            'lunch_late_minutes' => $this->lunchLateMinutes(),
            'is_lunch_deductible' => $this->isLunchLateDeductible(),
            'net_worked_minutes' => $this->net_worked_minutes,
            'overtime_minutes' => $this->overtime_minutes,
            'overtime_authorized' => $this->overtime_authorized,
            'overtime_authorized_at' => $this->overtime_authorized_at?->toIso8601String(),
            'overtime_valuation_method' => $this->overtime_valuation_method?->value,
            'overtime_rate_applied' => $this->overtime_rate_applied !== null ? (float) $this->overtime_rate_applied : null,
            'overtime_amount' => $this->overtime_amount !== null ? (float) $this->overtime_amount : null,
            'requires_overtime_decision' => ($this->overtime_minutes ?? 0) > 0 && $this->overtime_authorized_at === null,
            'day_status' => $this->day_status?->value,
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }
}
