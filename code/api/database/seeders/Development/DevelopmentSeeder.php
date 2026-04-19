<?php

namespace Database\Seeders\Development;

use Illuminate\Database\Seeder;

class DevelopmentSeeder extends Seeder
{
    public function run(): void
    {
        $this->command->info('🚀 Starting Development Seeders...');
        $this->command->newLine();

        $seeders = [
            PassportClientSeeder::class,
            RoleSeeder::class,
            PermissionSeeder::class,
            \Database\Seeders\BranchSeeder::class,
            \Database\Seeders\OperatingUnitSeeder::class,
            \Database\Seeders\InventoryLocationSeeder::class,
            \Database\Seeders\CashTerminalSeeder::class,
            \Database\Seeders\BankAccountSeeder::class,
            \Database\Seeders\CashRegisterSeeder::class,
            UserSeeder::class,
            UserRoleSeeder::class,
            AdminEmployeeSeeder::class,
            EmployeeSeeder::class,
            EmployeeScheduleSeeder::class,
            ScheduleHistorySeeder::class,
            \Database\Seeders\UnitOfMeasureSeeder::class,
            \Database\Seeders\UomConversionSeeder::class,
            AttendanceAuditLogSeeder::class,
            \Database\Seeders\LeaveTypeSeeder::class,
        ];

        foreach ($seeders as $seederClass) {
            $seeder = new $seederClass;
            $seeder->setCommand($this->command);
            $seeder();
        }

        $this->command->newLine();
        $this->command->info('✅ Development seeders completed!');
    }
}
