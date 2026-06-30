<?php

namespace App\Services\VacationRules;

use App\Contracts\VacationEntitlementRule;

/**
 * LFT México — Ley Federal del Trabajo, Art. 76 (2022 reform).
 *
 * Minimum vacation days by completed years of service:
 *   Year 1 → 12, Year 2 → 14, Year 3 → 16, Year 4 → 18, Year 5 → 20
 *   Years 6–10 → 22, Years 11–15 → 24, Years 16–20 → 26
 *   Years 21–25 → 28, Years 26–30 → 30, Years 31+ → 32 (+2 per 5-year bracket)
 */
class VacationsLFTMX implements VacationEntitlementRule
{
    public function calculate(int $years): int
    {
        return match (true) {
            $years <= 5 => 10 + ($years * 2),          // 12,14,16,18,20
            $years <= 10 => 22,
            $years <= 15 => 24,
            $years <= 20 => 26,
            $years <= 25 => 28,
            $years <= 30 => 30,
            default => 30 + (int) (ceil(($years - 30) / 5) * 2),
        };
    }

    public function label(): string
    {
        return 'LFT México 2022';
    }

    public function table(): array
    {
        return [
            ['years' => '1',     'days' => 12],
            ['years' => '2',     'days' => 14],
            ['years' => '3',     'days' => 16],
            ['years' => '4',     'days' => 18],
            ['years' => '5',     'days' => 20],
            ['years' => '6–10',  'days' => 22],
            ['years' => '11–15', 'days' => 24],
            ['years' => '16–20', 'days' => 26],
            ['years' => '21–25', 'days' => 28],
            ['years' => '26–30', 'days' => 30],
            ['years' => '31+',   'days' => 32],
        ];
    }
}
