<?php

namespace App\Http\Responses\Entities;

/**
 * @OA\Schema(
 *     schema="AttendanceResponse",
 *     title="Attendance Response",
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
 *     @OA\Property(property="requires_overtime_decision", type="boolean", example=false,
 *         description="True when overtime_minutes > 0 and overtime has not yet been authorized"),
 *     @OA\Property(property="day_status", type="string", enum={"WORKED","DAY_OFF","LEAVE","VACATION","HOLIDAY","ABSENCE","EXTRA"}, example="WORKED"),
 *     @OA\Property(property="created_at", type="string", format="date-time", example="2026-02-23T09:05:45.000000Z"),
 *     @OA\Property(property="updated_at", type="string", format="date-time", example="2026-02-23T09:05:45.000000Z")
 * )
 */
class AttendanceResponse {}
