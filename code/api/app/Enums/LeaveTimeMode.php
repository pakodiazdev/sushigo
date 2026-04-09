<?php

namespace App\Enums;

enum LeaveTimeMode: string
{
    case SCHEDULED = 'SCHEDULED';
    case OPEN_ENDED = 'OPEN_ENDED';
}
