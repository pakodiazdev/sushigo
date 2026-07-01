<?php

namespace App\Console\Commands;

use App\Models\Employee;
use App\Services\VacationEntitlementService;
use Illuminate\Console\Command;

class GenerateAnniversaryEntitlements extends Command
{
    protected $signature = 'vacation:generate-entitlements
        {--employee= : Only process this employee ID}
        {--dry-run   : Preview which entitlements would be created without saving}';

    protected $description = 'Auto-generate VacationEntitlement records for each past anniversary not yet registered';

    public function __construct(private readonly VacationEntitlementService $entitlements)
    {
        parent::__construct();
    }

    public function handle(): int
    {
        $dryRun = (bool) $this->option('dry-run');
        $employeeId = $this->option('employee');

        if ($dryRun) {
            $this->info('🔍 Dry-run mode — no records will be saved.');
        }

        $query = Employee::active()->with('employmentPeriods');

        if ($employeeId) {
            $query->where('id', $employeeId);
        }

        $employees = $query->get();

        if ($employees->isEmpty()) {
            $this->warn('No active employees found.');

            return self::SUCCESS;
        }

        $created = 0;
        $skipped = 0;

        foreach ($employees as $employee) {
            if ($employee->employmentPeriods->isEmpty()) {
                $this->warn("  ⚠ Employee #{$employee->id} has no employment periods — skipped.");

                continue;
            }

            $pending = $this->entitlements->pendingAnniversaries($employee);

            if ($pending === []) {
                $skipped++;

                continue;
            }

            foreach ($pending as $item) {
                $this->line("  ✓ Employee #{$employee->id} · year {$item['calendar_year']} · {$item['entitled_days']} days (seniority yr {$item['seniority_year']})");
                $created++;
            }

            if (! $dryRun) {
                $this->entitlements->generateMissing($employee);
            }
        }

        $this->newLine();

        if ($dryRun) {
            $this->info("🔍 Would create {$created} entitlements · {$skipped} already exist / not yet due.");
        } else {
            $this->info("✅ Created {$created} entitlements · {$skipped} already exist / not yet due.");
        }

        return self::SUCCESS;
    }
}
