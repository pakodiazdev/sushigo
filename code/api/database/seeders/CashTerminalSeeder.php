<?php

namespace Database\Seeders;

use App\Models\Branch;
use App\Models\CashTerminal;
use Illuminate\Database\Seeder;

class CashTerminalSeeder extends Seeder
{
    public function run(): void
    {
        $mainBranch = Branch::where('code', 'MAIN')->first();

        if (!$mainBranch) {
            $this->command->warn('Main branch not found. Please run BranchSeeder first.');
            return;
        }

        // CLIP terminal
        CashTerminal::updateOrCreate(
            [
                'branch_id' => $mainBranch->id,
                'provider' => 'CLIP',
                'account_ref' => 'CLIP-MAIN-01',
            ],
            [
                'name' => 'Terminal CLIP Principal',
                'last_four' => '5532',
                'is_active' => true,
                'meta' => [
                    'description' => 'Terminal CLIP principal del local',
                ],
            ]
        );

        // MERCADOPAGO terminal
        CashTerminal::updateOrCreate(
            [
                'branch_id' => $mainBranch->id,
                'provider' => 'MERCADOPAGO',
                'account_ref' => 'MP-MAIN-01',
            ],
            [
                'name' => 'Terminal MercadoPago',
                'last_four' => '3421',
                'is_active' => true,
                'meta' => [
                    'description' => 'Terminal MercadoPago para pagos con tarjeta',
                ],
            ]
        );

        // STRIPE terminal (opcional/inactiva)
        CashTerminal::updateOrCreate(
            [
                'branch_id' => $mainBranch->id,
                'provider' => 'STRIPE',
                'account_ref' => 'STR-MAIN-01',
            ],
            [
                'name' => 'Terminal Stripe',
                'last_four' => '7890',
                'is_active' => false,
                'meta' => [
                    'description' => 'Terminal Stripe (reserva)',
                ],
            ]
        );

        $this->command->info('✅ Cash terminals seeded successfully');
    }
}
