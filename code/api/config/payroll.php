<?php

return [
    /*
    |--------------------------------------------------------------------------
    | Week Start Day
    |--------------------------------------------------------------------------
    |
    | The ISO weekday on which the payroll week begins.
    | 1 = Monday (default) … 7 = Sunday
    |
    | SushiGo convention: weeks run Monday–Sunday. The cut-off happens at the
    | end of Sunday; payments are issued on Monday of the following week.
    |
    */
    'week_start_day' => (int) env('WEEK_START_DAY', 1),
];
