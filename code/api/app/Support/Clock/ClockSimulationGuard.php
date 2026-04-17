<?php

namespace App\Support\Clock;

use App\Exceptions\ClockSimulationMisconfigurationException;

/**
 * Guards devtools clock simulation endpoints.
 *
 * Returns 404 if simulation is not enabled or environment is not allowed.
 * Throws ClockSimulationMisconfigurationException if 'production' is misconfigured in allowed envs.
 */
class ClockSimulationGuard
{
    /**
     * Validate that clock simulation endpoints are accessible.
     *
     * @throws ClockSimulationMisconfigurationException if production is in allowed environments
     */
    public static function validate(): void
    {
        $allowedEnvs = array_map(
            fn ($e) => strtolower(trim($e)),
            explode(',', (string) config('clock.allowed_environments', ''))
        );

        // Hard fail if production is in allowed list (critical misconfiguration)
        if (in_array('production', $allowedEnvs, strict: true)) {
            throw new ClockSimulationMisconfigurationException(
                'CLOCK_SIMULATION_ALLOWED_ENVIRONMENTS must not contain "production". Critical misconfiguration.'
            );
        }

        $flagEnabled = config('clock.simulation_enabled') === true;

        if (! $flagEnabled) {
            abort(404);
        }

        $currentEnv = strtolower(app()->environment());

        if (! in_array($currentEnv, $allowedEnvs, strict: true)) {
            abort(404);
        }
    }
}
