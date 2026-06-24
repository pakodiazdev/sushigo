<?php

namespace App\Support\PayrollSeed;

use App\Exceptions\ClockSimulationMisconfigurationException;

/**
 * Guards devtools payroll seed endpoints.
 *
 * Returns 404 if seeding is not enabled or environment is not allowed.
 * Throws ClockSimulationMisconfigurationException if 'production' is misconfigured in allowed envs.
 */
class PayrollSeedGuard
{
    public static function validate(): void
    {
        $allowedEnvs = array_map(
            fn ($e) => strtolower(trim($e)),
            explode(',', (string) config('payroll_seed.allowed_environments', ''))
        );

        if (in_array('production', $allowedEnvs, strict: true)) {
            throw new ClockSimulationMisconfigurationException(
                'PAYROLL_SEED_ALLOWED_ENVIRONMENTS must not contain "production". Critical misconfiguration.'
            );
        }

        if (config('payroll_seed.enabled') !== true) {
            abort(404);
        }

        if (! in_array(strtolower(app()->environment()), $allowedEnvs, strict: true)) {
            abort(404);
        }
    }
}
