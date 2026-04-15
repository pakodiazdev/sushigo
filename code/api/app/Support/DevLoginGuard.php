<?php

namespace App\Support;

use RuntimeException;

class DevLoginGuard
{
    /**
     * Validates that the dev-debug login feature is enabled and the current
     * environment is in the allowed list. Aborts with 404 if any condition
     * fails — the endpoints appear non-existent to callers.
     *
     * Throws a RuntimeException if 'production' is in the allowed list,
     * because that is always a critical misconfiguration.
     */
    public static function validate(): void
    {
        $allowedEnvs = array_map(
            'trim',
            explode(',', (string) config('devlogin.allowed_environments', ''))
        );

        if (in_array('production', $allowedEnvs, strict: true)) {
            throw new RuntimeException(
                'DEV_LOGIN_ALLOWED_ENVIRONMENTS must not contain "production". This is a critical misconfiguration.'
            );
        }

        $flagEnabled = config('devlogin.enabled') === true;

        if (! $flagEnabled) {
            abort(404);
        }

        $currentEnv = app()->environment();

        if (! in_array($currentEnv, $allowedEnvs, strict: true)) {
            abort(404);
        }
    }
}
