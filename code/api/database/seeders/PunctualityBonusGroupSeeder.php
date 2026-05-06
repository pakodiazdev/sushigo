<?php

namespace Database\Seeders;

use App\Models\PunctualityBonusGroup;
use Database\Seeders\Base\RepeatableSeeder;

/**
 * Default SushiGo punctuality bonus groups.
 *
 * Group $110/week ÷ 6 days → $18.33/day
 * Group $100/week ÷ 6 days → $16.67/day
 * Group $50/week  ÷ 3 days → $16.67/day
 */
class PunctualityBonusGroupSeeder extends RepeatableSeeder
{
    private const GROUPS = [
        ['name' => 'Grupo $110 (÷6)', 'weekly_bonus_amount' => '110.00', 'working_days_divisor' => 6, 'is_active' => true],
        ['name' => 'Grupo $100 (÷6)', 'weekly_bonus_amount' => '100.00', 'working_days_divisor' => 6, 'is_active' => true],
        ['name' => 'Grupo $50 (÷3)',  'weekly_bonus_amount' => '50.00',  'working_days_divisor' => 3, 'is_active' => true],
    ];

    public function run(): void
    {
        foreach (self::GROUPS as $group) {
            PunctualityBonusGroup::updateOrCreate(
                ['name' => $group['name']],
                $group,
            );
        }
    }
}
