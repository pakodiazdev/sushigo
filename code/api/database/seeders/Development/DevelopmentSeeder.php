<?php

namespace Database\Seeders\Development;

use Illuminate\Database\Seeder;

class DevelopmentSeeder extends Seeder
{
    public function run(): void
    {
        $this->command->info("🚀 Starting Development Seeders...");
        $this->command->newLine();

        $seeders = [
            PassportClientSeeder::class,
            RoleSeeder::class,
            PermissionSeeder::class,
            \Database\Seeders\BranchSeeder::class,
            \Database\Seeders\OperatingUnitSeeder::class,
            \Database\Seeders\InventoryLocationSeeder::class,
            UserSeeder::class,
            UserRoleSeeder::class,
            \Database\Seeders\UnitOfMeasureSeeder::class,
            \Database\Seeders\UomConversionSeeder::class,
        ];

        foreach ($seeders as $seederClass) {
            $seeder = new $seederClass();
            $seeder->setCommand($this->command);
            $seeder();
        }

        $this->command->newLine();
        $this->command->info("✅ Development seeders completed!");
    }
}
