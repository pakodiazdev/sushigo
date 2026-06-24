<?php

namespace App\Enums;

enum SeedScenario: string
{
    case FULL_WEEK = 'full_week';
    case WITH_LATES = 'with_lates';
    case WITH_UNPAID_LEAVE = 'with_unpaid_leave';
    case WITH_OVERTIME = 'with_overtime';
    case WITH_ABSENCES = 'with_absences';
    case MIXED = 'mixed';
}
