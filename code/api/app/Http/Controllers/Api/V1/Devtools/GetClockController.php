<?php

namespace App\Http\Controllers\Api\V1\Devtools;

use App\Http\Controllers\Controller;
use App\Support\Clock\ApplicationClock;
use App\Support\Clock\ClockSimulationGuard;
use Illuminate\Http\JsonResponse;

/**
 * Get current Application Clock state.
 *
 * Only available when CLOCK_SIMULATION_ENABLED=true and environment is allowed.
 */
class GetClockController extends Controller
{
    public function __invoke(ApplicationClock $clock): JsonResponse
    {
        ClockSimulationGuard::validate();

        return response()->json([
            'mode' => $clock->mode()->value,
            'application_now_utc' => $clock->nowUtc()->toIso8601String(),
            'business_timezone' => $clock->businessTimezone(),
            'business_date' => $clock->todayInBusinessTz(),
            'business_now' => $clock->nowInBusinessTz()->toIso8601String(),
        ]);
    }
}
