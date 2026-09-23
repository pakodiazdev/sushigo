<?php

namespace Database\Seeders\Demo;

use Database\Seeders\BankAccountSeeder;
use Database\Seeders\BranchSeeder;
use Database\Seeders\CashRegisterSeeder;
use Database\Seeders\CashTerminalSeeder;
use Database\Seeders\Development\AdminEmployeeSeeder;
use Database\Seeders\Development\BrandSeeder;
use Database\Seeders\Development\DishCategorySeeder;
use Database\Seeders\Development\DishSeeder;
use Database\Seeders\Development\HolidayDefinitionSeeder;
use Database\Seeders\Development\InventoryCategorySeeder;
use Database\Seeders\Development\PassportClientSeeder;
use Database\Seeders\Development\PermissionSeeder;
use Database\Seeders\Development\PricingSeeder;
use Database\Seeders\Development\ProductCatalogSeeder;
use Database\Seeders\Development\PurchasePresentationTemplateSeeder;
use Database\Seeders\Development\PurchaseReceiptSeeder;
use Database\Seeders\Development\RoleSeeder;
use Database\Seeders\Development\SupplierSeeder;
use Database\Seeders\Development\UserSeeder;
use Database\Seeders\Development\VacationEntitlementSeeder;
use Database\Seeders\Development\WageSeeder;
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
use RuntimeException;

/**
 * Canonical, deterministic dataset for the public Demo environment (#635).
 *
 * Reuses the Development catalog/inventory seeders that are already
 * config-driven and idempotent, and swaps every seeder that draws random
 * values (EmployeeSeeder, EmployeeScheduleSeeder, the attendance history and
 * audit-log seeders) for DemoEmployeeSeeder, so every reset produces the same
 * data. Dates are anchored to the day the reset runs, which keeps the demo
 * looking current without making two same-day resets differ.
 *
 * Only ever invoked explicitly — by `php artisan demo:reset` (manual or the
 * scheduled demo-ops workflow) or `db:seed` under APP_ENV=demo. Demo's
 * deploy pipeline never seeds (TD-07 "Migration ownership").
 */
class DemoSeeder extends Seeder
{
    /**
     * The hardcoded fallbacks in config/seeders.php. Demo is public, so the
     * operator accounts (super-admin/admin/inventory) must never be created
     * with a password anyone can read in this repository.
     */
    private const FALLBACK_PASSWORDS = [
        'admin' => ['admin123456', 'SEEDER_ADMIN_PASSWORD'],
        'employee' => ['employee123456', 'SEEDER_EMPLOYEE_PASSWORD'],
        'inventory' => ['inventory123456', 'SEEDER_INVENTORY_PASSWORD'],
    ];

    public function run(): void
    {
        $this->guardAgainstFallbackPasswords();

        $this->command->info('🎭 Seeding the canonical Demo dataset...');

        $seeders = [
            PassportClientSeeder::class,
            RoleSeeder::class,
            PermissionSeeder::class,
            DemoRoleSeeder::class,
            BranchSeeder::class,
            OperatingUnitSeeder::class,
            InventoryLocationSeeder::class,
            CashTerminalSeeder::class,
            BankAccountSeeder::class,
            CashRegisterSeeder::class,
            UserSeeder::class,
            DemoUserSeeder::class,
            AdminEmployeeSeeder::class,
            DemoEmployeeSeeder::class,
            WageSeeder::class,
            VacationEntitlementSeeder::class,
            UnitOfMeasureSeeder::class,
            UomConversionSeeder::class,
            DishCategorySeeder::class,
            DishSeeder::class,
            BrandSeeder::class,
            InventoryCategorySeeder::class,
            PurchasePresentationTemplateSeeder::class,
            ProductCatalogSeeder::class,
            SupplierSeeder::class,
            PurchaseReceiptSeeder::class,
            PricingSeeder::class,
            LeaveTypeSeeder::class,
            PunctualityRangeSeeder::class,
            PunctualityBonusGroupSeeder::class,
            OvertimeLftTierSeeder::class,
            HolidayDefinitionSeeder::class,
            HolidaySeeder::class,
        ];

        foreach ($seeders as $seederClass) {
            $seeder = new $seederClass;
            $seeder->setCommand($this->command);
            $seeder();
        }

        $this->command->info('✅ Demo dataset seeded');
    }

    private function guardAgainstFallbackPasswords(): void
    {
        if (! app()->environment('demo')) {
            return;
        }

        $configured = config('seeders.passwords', []);

        foreach (self::FALLBACK_PASSWORDS as $key => [$fallback, $envVar]) {
            if (($configured[$key] ?? $fallback) === $fallback) {
                throw new RuntimeException("{$envVar} must be set to a non-default value before seeding the public Demo.");
            }
        }
    }
}
