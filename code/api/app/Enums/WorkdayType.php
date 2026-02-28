<?php

namespace App\Enums;

/**
 * Classifies whether a schedule uses a fixed full-day configuration
 * for all working days (FULL) or allows variable times per day (PARTIAL).
 *
 * FULL    — every working day shares the same expected_start / expected_end.
 * PARTIAL — each ScheduleDay may have different start/end times (e.g., shorter Saturdays).
 *
 * @see AP-007
 */
enum WorkdayType: string
{
    case FULL = 'FULL';
    case PARTIAL = 'PARTIAL';
}
