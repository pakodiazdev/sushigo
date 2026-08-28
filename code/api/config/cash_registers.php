<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Cash Register Code Prefix
    |--------------------------------------------------------------------------
    |
    | Prefix used when suggesting the next Cash Register code.
    | The system will suggest: prefix + zero-padded consecutive number.
    | Example with prefix "REG-": REG-001, REG-002, REG-003, ...
    |
    */

    'code_prefix' => env('CASH_REGISTER_CODE_PREFIX', 'REG-'),

    /*
    |--------------------------------------------------------------------------
    | Cash Register Code Padding
    |--------------------------------------------------------------------------
    |
    | Minimum number of digits for the numeric part of the suggested code.
    | Example with padding 3: REG-001, REG-042, REG-999, REG-1000
    |
    */

    'code_padding' => (int) env('CASH_REGISTER_CODE_PADDING', 3),

];
