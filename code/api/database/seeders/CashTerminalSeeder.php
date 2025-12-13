<?php

namespace Database\Seeders;

use App\Models\Branch;
use App\Models\CashTerminal;
use Illuminate\Database\Seeder;

class CashTerminalSeeder extends Seeder
{
    public function run(): void
    {
        $branches = Branch::all();

        foreach ($branches as $branch) {
            // CLIP terminal
            CashTerminal::create([
                'branch_id' => $branch->id,
                'provider' => 'CLIP',
                'terminal_code' => "CLIP-{$branch->code}-01",
                'last_four' => sprintf('%04d', rand(1000, 9999)),
                'is_active' => true,
            ]);

            // MERCADOPAGO terminal
            CashTerminal::create([
                'branch_id' => $branch->id,
                'provider' => 'MERCADOPAGO',
                'terminal_code' => "MP-{$branch->code}-01",
                'last_four' => sprintf('%04d', rand(1000, 9999)),
                'is_active' => true,
            ]);

            // STRIPE terminal (optional)
            CashTerminal::create([
                'branch_id' => $branch->id,
                'provider' => 'STRIPE',
                'terminal_code' => "STR-{$branch->code}-01",
                'last_four' => sprintf('%04d', rand(1000, 9999)),
                'is_active' => false,
            ]);
        }

        $this->command->info('✓ Cash terminals seeded successfully');
    }
}
