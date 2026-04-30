<?php

namespace Database\Seeders;

use App\Models\PunctualityRange;
use Database\Seeders\Base\RepeatableSeeder;

/**
 * Default SushiGo punctuality bonus percentage ranges.
 *
 * Ranges (in seconds):
 *   0 – 599    → 100%   (on time or up to 9 min 59 s late)
 *   600 – 899  →  50%   (10 – 14 min 59 s)
 *   900 – 1259 →  25%   (15 – 20 min 59 s)
 *   1260 – 1559 → 10%   (21 – 25 min 59 s)
 *   1560 +     →   0%   (26 min or more)
 */
class PunctualityRangeSeeder extends RepeatableSeeder
{
    private const RANGES = [
        ['min_seconds' => 0,    'max_seconds' => 599,  'bonus_percentage' => '100.00', 'sort_order' => 1],
        ['min_seconds' => 600,  'max_seconds' => 899,  'bonus_percentage' => '50.00',  'sort_order' => 2],
        ['min_seconds' => 900,  'max_seconds' => 1259, 'bonus_percentage' => '25.00',  'sort_order' => 3],
        ['min_seconds' => 1260, 'max_seconds' => 1559, 'bonus_percentage' => '10.00',  'sort_order' => 4],
        ['min_seconds' => 1560, 'max_seconds' => null,  'bonus_percentage' => '0.00',   'sort_order' => 5],
    ];

    public function run(): void
    {
        foreach (self::RANGES as $range) {
            PunctualityRange::updateOrCreate(
                ['sort_order' => $range['sort_order']],
                $range,
            );
        }
    }
}
