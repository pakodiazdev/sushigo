<?php

namespace App\Http\Controllers\Api\V1\Devtools;

use App\Http\Controllers\Api\V1\Devtools\Concerns\AppliesSimulatedClock;
use App\Http\Controllers\Controller;
use App\Support\Clock\ApplicationClock;
use App\Support\Clock\ClockSimulationGuard;
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
    use AppliesSimulatedClock;

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

        return response()->json([
            ...$this->applySimulatedClock($clock, $targetDatetime),
            'shifted_minutes' => $minutes,
        ]);
    }
}
