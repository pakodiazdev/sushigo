<?php

namespace App\Http\Controllers\Api\V1\Devtools\Concerns;

use App\Enums\ClockMode;
use App\Models\ApplicationClockState;
use App\Support\Clock\ApplicationClock;
use App\Support\Clock\DatabaseApplicationClock;
use Carbon\CarbonImmutable;

trait AppliesSimulatedClock
{
    /**
     * Persist the given target datetime as the new simulated clock state
     * and return the resulting clock snapshot.
     *
     * @return array<string, mixed>
     */
    protected function applySimulatedClock(ApplicationClock $clock, CarbonImmutable $targetDatetime): array
    {
        $state = ApplicationClockState::current();
        $state->update([
            'mode' => ClockMode::SIMULATED,
            'base_datetime_utc' => $targetDatetime,
            'started_real_datetime_utc' => CarbonImmutable::now('UTC'),
            'updated_by' => auth()->id(),
        ]);

        // Clear cache so next read reflects new state
        if ($clock instanceof DatabaseApplicationClock) {
            $clock->clearCache();
        }

        return [
            'mode' => $clock->mode()->value,
            'application_now_utc' => $clock->nowUtc()->toIso8601String(),
            'business_timezone' => $clock->businessTimezone(),
            'business_date' => $clock->todayInBusinessTz(),
            'business_now' => $clock->nowInBusinessTz()->toIso8601String(),
        ];
    }
}
