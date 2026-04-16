<?php

namespace App\Http\Controllers\Api\V1\Devtools;

use App\Enums\ClockMode;
use App\Http\Controllers\Controller;
use App\Models\ApplicationClockState;
use App\Support\Clock\ApplicationClock;
use App\Support\Clock\ClockSimulationGuard;
use App\Support\Clock\DatabaseApplicationClock;
use Illuminate\Http\JsonResponse;

/**
 * Reset Application Clock to system mode (real time).
 *
 * Only available when CLOCK_SIMULATION_ENABLED=true and environment is allowed.
 */
class ResetClockController extends Controller
{
    public function __invoke(ApplicationClock $clock): JsonResponse
    {
        ClockSimulationGuard::validate();

        $state = ApplicationClockState::current();
        $state->update([
            'mode' => ClockMode::SYSTEM,
            'base_datetime_utc' => null,
            'started_real_datetime_utc' => null,
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
        ]);
    }
}
