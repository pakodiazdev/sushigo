<?php

namespace App\Enums;

enum LeaveCalculationMode: string
{
    case FIXED_PERCENTAGE = 'FIXED_PERCENTAGE';
    case PROPORTIONAL_HOURS = 'PROPORTIONAL_HOURS';
}
