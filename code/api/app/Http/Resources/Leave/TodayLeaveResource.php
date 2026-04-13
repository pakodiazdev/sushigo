<?php

namespace App\Http\Resources\Leave;

use App\Models\Leave;
use Carbon\Carbon;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Minimal leave context for the Today attendance view.
 *
 * Used as an inline field (`today_leave`) on each row returned by
 * TodayAttendanceController. Omits leave-type detail, requestedBy, etc.
 * — the card only needs what is necessary to render a contextual chip.
 *
 * @mixin Leave
 *
 * @OA\Schema(
 *     schema="TodayLeaveResponse",
 *     title="Today Leave Context",
 *
 *     @OA\Property(property="id",               type="string",  example="01JKXYZ1234567890ABCDEFGH"),
 *     @OA\Property(property="time_mode",         type="string",  enum={"SCHEDULED","OPEN_ENDED"}, example="OPEN_ENDED"),
 *     @OA\Property(property="calculation_mode",  type="string",  enum={"FIXED_PERCENTAGE","PROPORTIONAL_HOURS"}, example="FIXED_PERCENTAGE"),
 *     @OA\Property(property="is_paid",           type="boolean", example=true),
 *     @OA\Property(property="starts_at",         type="string",  nullable=true, example="2026-04-13T15:00:00+00:00"),
 *     @OA\Property(property="ends_at",           type="string",  nullable=true, example="2026-04-13T20:00:00+00:00"),
 *     @OA\Property(property="note",              type="string",  nullable=true, example="Cita médica")
 * )
 */
class TodayLeaveResource extends JsonResource
{
    /**
     * @param  Leave  $resource
     * @param  string  $today  Business-timezone date string (YYYY-MM-DD)
     */
    public function __construct(mixed $resource, private readonly string $today)
    {
        parent::__construct($resource);
    }

    /**
     * @return array<string, mixed>
     */
    public function toArray($request): array
    {
        $businessTz = config('app.business_timezone');

        return [
            'id' => $this->public_id,
            'time_mode' => $this->time_mode?->value ?? 'OPEN_ENDED',
            'calculation_mode' => $this->leaveType->calculation_mode->value,
            'is_paid' => $this->resolvedPayPercentage() > 0,
            'starts_at' => $this->scheduled_start_time
                ? Carbon::parse($this->today.' '.$this->scheduled_start_time, $businessTz)->utc()->toIso8601String()
                : null,
            'ends_at' => $this->scheduled_end_time
                ? Carbon::parse($this->today.' '.$this->scheduled_end_time, $businessTz)->utc()->toIso8601String()
                : null,
            'note' => $this->notes,
        ];
    }
}
