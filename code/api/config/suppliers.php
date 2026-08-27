<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Supplier Code Prefix
    |--------------------------------------------------------------------------
    |
    | Prefix used when suggesting the next Supplier code.
    | The system will suggest: prefix + zero-padded consecutive number.
    | Example with prefix "PROV-": PROV-001, PROV-002, PROV-003, ...
    |
    */

    'code_prefix' => env('SUPPLIER_CODE_PREFIX', 'PROV-'),

    /*
    |--------------------------------------------------------------------------
    | Supplier Code Padding
    |--------------------------------------------------------------------------
    |
    | Minimum number of digits for the numeric part of the suggested code.
    | Example with padding 3: PROV-001, PROV-042, PROV-999, PROV-1000
    |
    */

    'code_padding' => (int) env('SUPPLIER_CODE_PADDING', 3),

];
