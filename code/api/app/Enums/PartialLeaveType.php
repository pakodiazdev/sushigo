<?php

namespace App\Enums;

enum PartialLeaveType: string
{
    case ARRIVE_LATE = 'ARRIVE_LATE';
    case LEAVE_EARLY = 'LEAVE_EARLY';
    case TAKE_TIME = 'TAKE_TIME';
}
