<?php

namespace Database\Seeders;

use App\Models\Branch;
use Illuminate\Database\Seeder;

class BranchSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        Branch::updateOrCreate(
            ['code' => 'MAIN'],
            [
                'name' => 'SushiGo Principal',
                'region' => 'CDMX',
                'timezone' => 'America/Mexico_City',
                'is_active' => true,
                'meta' => [
                    'address' => 'Av. Insurgentes Sur 123, Col. Roma, CDMX',
                    'phone' => '+52 55 1234 5678',
                ],
            ]
        );

        $this->command->info('✅ Branch seeded successfully');
    }
}
