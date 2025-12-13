<?php

namespace Database\Seeders;

use App\Models\BankAccount;
use App\Models\Branch;
use Illuminate\Database\Seeder;

class BankAccountSeeder extends Seeder
{
    public function run(): void
    {
        $branches = Branch::all();

        $banks = [
            'BBVA',
            'SANTANDER',
            'BANORTE',
            'HSBC',
            'SCOTIABANK',
        ];

        foreach ($branches as $index => $branch) {
            $bank = $banks[$index % count($banks)];

            BankAccount::create([
                'branch_id' => $branch->id,
                'bank_name' => $bank,
                'account_number' => '****' . sprintf('%04d', rand(1000, 9999)),
                'clabe' => str_repeat('*', 14) . sprintf('%04d', rand(1000, 9999)),
                'is_active' => true,
            ]);
        }

        $this->command->info('✓ Bank accounts seeded successfully');
    }
}
