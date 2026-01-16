<?php

namespace Database\Seeders\Production;

use Illuminate\Database\Seeder;
use Spatie\Permission\Models\Role;

class ProductionSeeder extends Seeder
{
    public function run(): void
    {
        $this->command->info("🚀 Starting Production Seeders...");
        $this->command->newLine();

        $seeders = [
            PassportClientSeeder::class,
            RoleSeeder::class,
            PermissionSeeder::class,
            \Database\Seeders\BranchSeeder::class,
            \Database\Seeders\OperatingUnitSeeder::class,
            UserSeeder::class, // ⚠️ Creates default admin user - must be disabled after setup
            \Database\Seeders\InventoryLocationSeeder::class,
            \Database\Seeders\CashTerminalSeeder::class,
            \Database\Seeders\BankAccountSeeder::class,
            \Database\Seeders\CashRegisterSeeder::class,
            \Database\Seeders\UnitOfMeasureSeeder::class,
            \Database\Seeders\UomConversionSeeder::class,
        ];

        foreach ($seeders as $seederClass) {
            $seeder = new $seederClass();
            $seeder->setCommand($this->command);
            $seeder();
        }

        $this->command->newLine();
        $this->command->info("✅ Production seeders completed!");
    }
}
