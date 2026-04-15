<?php

return [
    /*
    |--------------------------------------------------------------------------
    | Dev Debug Login
    |--------------------------------------------------------------------------
    |
    | Controls the quick user-switch feature in the DevDebugger panel.
    | Both conditions must be true for the endpoints to respond (non-404):
    |
    |   1. LOGIN_WITH_DEVDEBUG must be exactly 'true'
    |   2. APP_ENV must be in DEV_LOGIN_ALLOWED_ENVIRONMENTS (csv)
    |
    | If 'production' appears in DEV_LOGIN_ALLOWED_ENVIRONMENTS, a
    | RuntimeException is thrown — this is always a misconfiguration.
    |
    */

    'enabled' => (bool) env('LOGIN_WITH_DEVDEBUG', false),

    'allowed_environments' => env('DEV_LOGIN_ALLOWED_ENVIRONMENTS', 'dev,devtest'),
];
