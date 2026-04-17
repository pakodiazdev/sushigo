<?php

namespace App\Http\Resources\Schedule;

use App\Http\Resources\BaseResource;

/**
 * @OA\Schema(
 *     schema="ScheduleResponse",
 *     title="Schedule Response",
 *
 *     @OA\Property(property="id", type="string", example="01JKXYZ1234567890ABCDEFGH", description="ULID public identifier"),
 *     @OA\Property(property="effective_from", type="string", format="date", example="2026-03-01"),
 *     @OA\Property(property="effective_to", type="string", format="date", nullable=true, example=null),
 *     @OA\Property(property="workday_type", type="string", enum={"FULL","PARTIAL"}, example="FULL"),
 *     @OA\Property(property="working_days_per_week", type="integer", example=5),
 *     @OA\Property(
 *         property="days",
 *         type="array",
 *
 *         @OA\Items(
 *             type="object",
 *
 *             @OA\Property(property="day_of_week", type="integer", example=1, description="ISO 8601: 1=Monday … 7=Sunday"),
 *             @OA\Property(property="is_day_off", type="boolean", example=false),
 *             @OA\Property(property="expected_start", type="string", nullable=true, example="08:00"),
 *             @OA\Property(property="expected_lunch_start", type="string", nullable=true, example="13:00"),
 *             @OA\Property(property="expected_lunch_end", type="string", nullable=true, example="14:00"),
 *             @OA\Property(property="lunch_duration_minutes", type="integer", nullable=true, example=60),
 *             @OA\Property(property="expected_end", type="string", nullable=true, example="17:00")
 *         )
 *     ),
 *     @OA\Property(property="created_at", type="string", format="date-time"),
 *     @OA\Property(property="updated_at", type="string", format="date-time")
 * )
 */
class ScheduleResource extends BaseResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray($request): array
    {
        return [
            'id' => $this->public_id,
            'employment_period_id' => $this->whenLoaded('employmentPeriod', fn () => $this->employmentPeriod->public_id),
            'effective_from' => $this->effective_from?->toDateString(),
            'effective_to' => $this->effective_to?->toDateString(),
            'workday_type' => $this->workday_type,
            'working_days_per_week' => $this->working_days_per_week,
            'days' => ScheduleDayResource::collection($this->whenLoaded('scheduleDays')),
            'active_overrides' => $this->whenLoaded('employmentPeriod', function () {
                if (! $this->employmentPeriod->relationLoaded('scheduleDayOverrides')) {
                    return [];
                }

                // Use the reference date passed from the controller (ApplicationClock-aware)
                // to ensure consistency with simulated clock mode. Falls back to branch
                // timezone-aware now() if not provided (e.g., when resource is used elsewhere).
                $referenceDate = $this->additional['reference_date'] ?? null;

                if (! $referenceDate) {
                    // Fallback: use branch timezone for consistency with evening hours
                    $timezone = $this->employmentPeriod->branch?->timezone ?? 'UTC';
                    $referenceDate = now($timezone)->toDateString();
                }

                $notExpired = $this->employmentPeriod->scheduleDayOverrides->filter(
                    fn ($o) => is_null($o->effective_to) || $o->effective_to->toDateString() >= $referenceDate
                )->values();

                // The overrides come from the parent's eager-loaded collection, so
                // their own `employmentPeriod` relation is not loaded. Set it explicitly
                // so ScheduleDayOverrideResource can include employment_period_id.
                $notExpired->each(fn ($o) => $o->setRelation('employmentPeriod', $this->employmentPeriod));

                return ScheduleDayOverrideResource::collection($notExpired);
            }),
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }
}
