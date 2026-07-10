<?php

namespace App\Enums;

enum EmployeeRequestType: string
{
    case EXTRA_DAY = 'EXTRA_DAY';
    case LEAVE = 'LEAVE';
    case SCHEDULE_CHANGE = 'SCHEDULE_CHANGE';
}
