<?php

namespace App\Enums;

enum OvertimeValuationMethod: string
{
    case LFT_PROPORTIONAL = 'LFT_PROPORTIONAL';
    case AGREED_RATE = 'AGREED_RATE';
    case SALARY_FACTOR = 'SALARY_FACTOR';
}
