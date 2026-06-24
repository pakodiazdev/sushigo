<?php

return [
    /*
    |--------------------------------------------------------------------------
    | Payroll Seed Enabled
    |--------------------------------------------------------------------------
    |
    | When enabled, the devtools payroll seed endpoint is available.
    | This should ALWAYS be false in production.
    |
    */
    'enabled' => env('PAYROLL_SEED_ENABLED', false),

    /*
    |--------------------------------------------------------------------------
    | Allowed Environments
    |--------------------------------------------------------------------------
    |
    | Comma-separated list of environments where payroll seeding is allowed.
    | 'production' must NEVER be in this list.
    |
    */
    'allowed_environments' => env('PAYROLL_SEED_ALLOWED_ENVIRONMENTS', 'local,devtest,testing'),
];
