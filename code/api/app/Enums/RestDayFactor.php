<?php

namespace App\Enums;

enum RestDayFactor: string
{
    case FULL = 'FULL';
    case PROPORTIONAL = 'PROPORTIONAL';
    case NONE = 'NONE';
}
