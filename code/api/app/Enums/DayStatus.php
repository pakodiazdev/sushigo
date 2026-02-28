<?php

namespace App\Enums;

enum DayStatus: string
{
    case WORKED = 'WORKED';
    case DAY_OFF = 'DAY_OFF';
    case LEAVE = 'LEAVE';
    case VACATION = 'VACATION';
    case HOLIDAY = 'HOLIDAY';
    case ABSENCE = 'ABSENCE';
    case EXTRA = 'EXTRA';
}
