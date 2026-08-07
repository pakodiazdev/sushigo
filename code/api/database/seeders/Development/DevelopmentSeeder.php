<?php

namespace Database\Seeders\Development;

use Database\Seeders\BankAccountSeeder;
use Database\Seeders\BranchSeeder;
use Database\Seeders\CashRegisterSeeder;
use Database\Seeders\CashTerminalSeeder;
use Database\Seeders\HolidaySeeder;
use Database\Seeders\InventoryLocationSeeder;
use Database\Seeders\LeaveTypeSeeder;
use Database\Seeders\OperatingUnitSeeder;
use Database\Seeders\OvertimeLftTierSeeder;
use Database\Seeders\PunctualityBonusGroupSeeder;
use Database\Seeders\PunctualityRangeSeeder;
use Database\Seeders\UnitOfMeasureSeeder;
use Database\Seeders\UomConversionSeeder;
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
            BranchSeeder::class,
            OperatingUnitSeeder::class,
            InventoryLocationSeeder::class,
            CashTerminalSeeder::class,
            BankAccountSeeder::class,
            CashRegisterSeeder::class,
            UserSeeder::class,
            UserRoleSeeder::class,
            AdminEmployeeSeeder::class,
            EmployeeSeeder::class,
            EmployeeScheduleSeeder::class,
            ScheduleHistorySeeder::class,
            WageSeeder::class,
            VacationEntitlementSeeder::class,
            UnitOfMeasureSeeder::class,
            UomConversionSeeder::class,
            DishCategorySeeder::class,
            DishSeeder::class,
            LeaveTypeSeeder::class,
            AttendanceHistorySeeder::class,
            AttendanceAuditLogSeeder::class,
            PunctualityRangeSeeder::class,
            PunctualityBonusGroupSeeder::class,
            OvertimeLftTierSeeder::class,
            HolidayDefinitionSeeder::class,
            HolidaySeeder::class,
            PayPeriodHistorySeeder::class,
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
