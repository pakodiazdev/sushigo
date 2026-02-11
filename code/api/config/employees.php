<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Employee Code Prefix
    |--------------------------------------------------------------------------
    |
    | Prefix used when suggesting the next employee code.
    | The system will suggest: prefix + zero-padded consecutive number.
    | Example with prefix "EMP-": EMP-001, EMP-002, EMP-003, ...
    |
    */

    'code_prefix' => env('EMPLOYEE_CODE_PREFIX', 'EMP-'),

    /*
    |--------------------------------------------------------------------------
    | Employee Code Padding
    |--------------------------------------------------------------------------
    |
    | Minimum number of digits for the numeric part of the suggested code.
    | Example with padding 3: EMP-001, EMP-042, EMP-999, EMP-1000
    |
    */

    'code_padding' => (int) env('EMPLOYEE_CODE_PADDING', 3),

    /*
    |--------------------------------------------------------------------------
    | Default Phone Country Code
    |--------------------------------------------------------------------------
    |
    | Default country code prepended to phone numbers when creating employees.
    | This version is designed for Mexico (+52). In future versions, this can
    | be made configurable per-user or dynamically detected.
    |
    */

    'default_phone_country' => env('DEFAULT_PHONE_COUNTRY', '+52'),

];
