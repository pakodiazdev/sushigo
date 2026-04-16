<?php

return [
    /*
    |--------------------------------------------------------------------------
    | Clock Simulation Enabled
    |--------------------------------------------------------------------------
    |
    | When enabled, the devtools clock endpoints are available.
    | This should ALWAYS be false in production.
    |
    */
    'simulation_enabled' => env('CLOCK_SIMULATION_ENABLED', false),

    /*
    |--------------------------------------------------------------------------
    | Allowed Environments
    |--------------------------------------------------------------------------
    |
    | Comma-separated list of environments where clock simulation is allowed.
    | 'production' must NEVER be in this list.
    |
    */
    'allowed_environments' => env('CLOCK_SIMULATION_ALLOWED_ENVIRONMENTS', 'local,devtest,testing'),

    /*
    |--------------------------------------------------------------------------
    | Business Timezone
    |--------------------------------------------------------------------------
    |
    | The timezone used for business operations (e.g., "today" calculations).
    |
    */
    'business_timezone' => env('APP_BUSINESS_TIMEZONE', 'America/Mexico_City'),
];
