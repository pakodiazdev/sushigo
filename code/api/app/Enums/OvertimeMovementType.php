<?php

namespace App\Enums;

enum OvertimeMovementType: string
{
    case EARNED = 'EARNED';
    case USED = 'USED';
    case PAID = 'PAID';
    case ADJUSTMENT = 'ADJUSTMENT';

    /** Positive impact = minutes added to bank; negative = minutes removed. */
    public function balanceImpact(int $minutes): int
    {
        return match ($this) {
            self::EARNED => abs($minutes),
            self::USED, self::PAID => -abs($minutes),
            self::ADJUSTMENT => $minutes,
        };
    }
}
