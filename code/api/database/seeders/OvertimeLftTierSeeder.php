<?php

namespace Database\Seeders;

use App\Models\OvertimeLftTier;
use Database\Seeders\Base\RepeatableSeeder;

/**
 * Default LFT (Ley Federal del Trabajo) overtime valuation tiers.
 *
 * Tiers (accumulated weekly overtime hours):
 *   0 – 9 hours → factor 2.00 (double time, Art. 66-67 LFT)
 *   9+ hours    → factor 3.00 (triple time, Art. 68 LFT)
 */
class OvertimeLftTierSeeder extends RepeatableSeeder
{
    private const TIERS = [
        ['factor' => '2.00', 'up_to_hours' => '9.00', 'sort_order' => 1],
        ['factor' => '3.00', 'up_to_hours' => null,   'sort_order' => 2],
    ];

    public function run(): void
    {
        foreach (self::TIERS as $tier) {
            OvertimeLftTier::updateOrCreate(
                ['sort_order' => $tier['sort_order']],
                $tier,
            );
        }
    }
}
