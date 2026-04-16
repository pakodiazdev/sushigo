<?php

namespace App\Http\Controllers\Api\V1\Devtools;

use App\Enums\ClockMode;
use App\Http\Controllers\Controller;
use App\Models\ApplicationClockState;
use App\Support\Clock\ApplicationClock;
use App\Support\Clock\ClockSimulationGuard;
use App\Support\Clock\DatabaseApplicationClock;
use Carbon\CarbonImmutable;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Shift Application Clock by N minutes (positive or negative).
 *
 * If clock is in system mode, it will switch to simulated mode.
 * Only available when CLOCK_SIMULATION_ENABLED=true and environment is allowed.
 */
class ShiftClockController extends Controller
{
    public function __invoke(Request $request, ApplicationClock $clock): JsonResponse
    {
        ClockSimulationGuard::validate();

        $validated = $request->validate([
            'minutes' => ['required', 'integer'],
        ]);

        $minutes = (int) $validated['minutes'];

        // Get current application time before the shift
        $currentAppTime = $clock->nowUtc();

        // Calculate new target time
        $targetDatetime = $currentAppTime->addMinutes($minutes);

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

        return response()->json([
            'mode' => $clock->mode()->value,
            'application_now_utc' => $clock->nowUtc()->toIso8601String(),
            'business_timezone' => $clock->businessTimezone(),
            'business_date' => $clock->todayInBusinessTz(),
            'business_now' => $clock->nowInBusinessTz()->toIso8601String(),
            'shifted_minutes' => $minutes,
        ]);
    }
}
