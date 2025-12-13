<?php

namespace Database\Seeders;

use App\Models\Branch;
use App\Models\CashRegister;
use Illuminate\Database\Seeder;

class CashRegisterSeeder extends Seeder
{
    public function run(): void
    {
        $branches = Branch::all();

        foreach ($branches as $branch) {
            // ON_PREMISE register
            CashRegister::create([
                'branch_id' => $branch->id,
                'code' => "REG-{$branch->code}-01",
                'name' => "Caja Principal - {$branch->name}",
                'register_type' => 'ON_PREMISE',
                'is_active' => true,
            ]);

            // DELIVERY register
            CashRegister::create([
                'branch_id' => $branch->id,
                'code' => "REG-{$branch->code}-02",
                'name' => "Caja Delivery - {$branch->name}",
                'register_type' => 'DELIVERY',
                'is_active' => true,
            ]);

            // EVENT register
            CashRegister::create([
                'branch_id' => $branch->id,
                'code' => "REG-{$branch->code}-03",
                'name' => "Caja Eventos - {$branch->name}",
                'register_type' => 'EVENT',
                'is_active' => true,
            ]);
        }

        $this->command->info('✓ Cash registers seeded successfully');
    }
}
