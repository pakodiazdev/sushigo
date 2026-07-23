<?php

namespace App\Http\Controllers\Api\V1\Devtools;

use App\Http\Controllers\Api\V1\Devtools\Concerns\AppliesSimulatedClock;
use App\Http\Controllers\Controller;
use App\Support\Clock\ApplicationClock;
use App\Support\Clock\ClockSimulationGuard;
use Carbon\CarbonImmutable;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Set Application Clock to a specific datetime (simulated mode).
 *
 * Only available when CLOCK_SIMULATION_ENABLED=true and environment is allowed.
 */
class SetClockController extends Controller
{
    use AppliesSimulatedClock;

    public function __invoke(Request $request, ApplicationClock $clock): JsonResponse
    {
        ClockSimulationGuard::validate();

        $validated = $request->validate([
            'datetime' => ['required', 'date'],
        ]);

        // Interpret the datetime in the business timezone, then convert to UTC
        // The user inputs time in their local/business context (e.g., 13:00 Mexico City)
        $businessTz = $clock->businessTimezone();
        $targetDatetime = CarbonImmutable::parse($validated['datetime'], $businessTz)->utc();

        return response()->json($this->applySimulatedClock($clock, $targetDatetime));
    }
}
