<?php

namespace Database\Seeders;

use App\Models\BankAccount;
use App\Models\Branch;
use Illuminate\Database\Seeder;

class BankAccountSeeder extends Seeder
{
    public function run(): void
    {
        $mainBranch = Branch::where('code', 'MAIN')->first();

        if (!$mainBranch) {
            $this->command->warn('Main branch not found. Please run BranchSeeder first.');
            return;
        }

        $accounts = [
            [
                'alias' => 'Cuenta Operativa Principal',
                'bank_name' => 'BBVA',
                'account_number_masked' => '****5532',
                'clabe_masked' => '012***********3421',
            ],
            [
                'alias' => 'Cuenta de Nómina',
                'bank_name' => 'SANTANDER',
                'account_number_masked' => '****7890',
                'clabe_masked' => '014***********6543',
            ],
            [
                'alias' => 'Cuenta de Ahorros',
                'bank_name' => 'BANORTE',
                'account_number_masked' => '****2109',
                'clabe_masked' => '072***********8765',
            ],
        ];

        foreach ($accounts as $accountData) {
            BankAccount::updateOrCreate(
                [
                    'branch_id' => $mainBranch->id,
                    'alias' => $accountData['alias'],
                ],
                [
                    'bank_name' => $accountData['bank_name'],
                    'account_number_masked' => $accountData['account_number_masked'],
                    'clabe_masked' => $accountData['clabe_masked'],
                    'is_active' => true,
                    'meta' => [
                        'description' => 'Cuenta bancaria para operaciones de ' . $mainBranch->name,
                    ],
                ]
            );
        }

        $this->command->info('✅ Bank accounts seeded successfully');
    }
}
