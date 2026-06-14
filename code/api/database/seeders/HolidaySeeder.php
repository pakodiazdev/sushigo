<?php

namespace Database\Seeders;

use App\Models\Holiday;
use Database\Seeders\Base\OnceSeeder;

class HolidaySeeder extends OnceSeeder
{
    public function run(): void
    {
        $holidays = [
            ['date' => '2026-01-01', 'name' => 'New Year\'s Day', 'pay_multiplier' => 2.00],
            ['date' => '2026-02-02', 'name' => 'Constitution Day', 'pay_multiplier' => 2.00],
            ['date' => '2026-03-16', 'name' => 'Benito Juárez Birthday', 'pay_multiplier' => 2.00],
            ['date' => '2026-05-01', 'name' => 'Labor Day', 'pay_multiplier' => 2.00],
            ['date' => '2026-09-16', 'name' => 'Independence Day', 'pay_multiplier' => 2.00],
            ['date' => '2026-11-16', 'name' => 'Revolution Day', 'pay_multiplier' => 2.00],
            ['date' => '2026-12-25', 'name' => 'Christmas Day', 'pay_multiplier' => 2.00],
        ];

        foreach ($holidays as $holiday) {
            Holiday::updateOrCreate(
                ['date' => $holiday['date']],
                $holiday
            );
        }
    }
}
