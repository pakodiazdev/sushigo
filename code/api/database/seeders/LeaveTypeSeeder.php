<?php

namespace Database\Seeders;

use App\Models\LeaveType;
use Database\Seeders\Base\OnceSeeder;

class LeaveTypeSeeder extends OnceSeeder
{
    public function run(): void
    {
        $types = [
            [
                'code' => LeaveType::MEDICAL,
                'name' => 'Incapacidad médica',
                'calculation_mode' => 'FIXED_PERCENTAGE',
                'default_pay_percentage' => 0.00,
                'default_rest_day_factor' => 'NONE',
                'counts_for_bonus' => false,
            ],
            [
                'code' => LeaveType::PERSONAL,
                'name' => 'Permiso personal',
                'calculation_mode' => 'FIXED_PERCENTAGE',
                'default_pay_percentage' => 0.00,
                'default_rest_day_factor' => 'NONE',
                'counts_for_bonus' => false,
            ],
            [
                'code' => LeaveType::PERMISSION,
                'name' => 'Permiso',
                'calculation_mode' => 'FIXED_PERCENTAGE',
                'default_pay_percentage' => 0.00,
                'default_rest_day_factor' => 'NONE',
                'counts_for_bonus' => false,
            ],
            [
                'code' => LeaveType::PERMISSION_HOURS,
                'name' => 'Permiso por horas',
                'calculation_mode' => 'PROPORTIONAL_HOURS',
                'default_pay_percentage' => 0.00,
                'default_rest_day_factor' => 'PROPORTIONAL',
                'counts_for_bonus' => false,
            ],
        ];

        foreach ($types as $type) {
            LeaveType::updateOrCreate(
                ['code' => $type['code']],
                $type
            );
        }
    }
}
