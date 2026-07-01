<?php

declare(strict_types=1);

namespace Database\Seeders\Development;

use App\Models\Employee;
use App\Services\VacationEntitlementService;
use Database\Seeders\Base\RepeatableSeeder;

/**
 * Backfills VacationEntitlement records for every already-registered employee
 * using the same auto-generation logic as `vacation:generate-entitlements`
 * and the vacation-entitlements list endpoint. Safe to rerun — only creates
 * anniversaries that are missing.
 */
class VacationEntitlementSeeder extends RepeatableSeeder
{
    public function run(): void
    {
        $entitlements = app(VacationEntitlementService::class);

        $employees = Employee::active()->with('employmentPeriods')->get();
        $created = 0;

        foreach ($employees as $employee) {
            if ($employee->employmentPeriods->isEmpty()) {
                continue;
            }

            $created += $entitlements->generateMissing($employee)->count();
        }

        $this->command->info("✓ Generated {$created} vacation entitlements for existing employees");
    }
}
