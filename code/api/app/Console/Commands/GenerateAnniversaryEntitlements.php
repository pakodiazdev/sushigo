<?php

namespace App\Console\Commands;

use App\Contracts\VacationEntitlementRule;
use App\Models\Employee;
use App\Models\VacationEntitlement;
use App\Services\SeniorityService;
use Illuminate\Console\Command;

class GenerateAnniversaryEntitlements extends Command
{
    protected $signature = 'vacation:generate-entitlements
        {--employee= : Only process this employee ID}
        {--dry-run   : Preview which entitlements would be created without saving}';

    protected $description = 'Auto-generate VacationEntitlement records for each past anniversary not yet registered';

    public function __construct(
        private readonly SeniorityService $seniority,
        private readonly VacationEntitlementRule $rule,
    ) {
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
            try {
                $completedYears = $this->seniority->completedYears($employee);
            } catch (\LogicException) {
                $this->warn("  ⚠ Employee #{$employee->id} has no employment periods — skipped.");

                continue;
            }

            if ($completedYears === 0) {
                $skipped++;

                continue;
            }

            $start = $this->seniority->effectiveStartDate($employee);

            for ($year = 1; $year <= $completedYears; $year++) {
                $anniversaryDate = $start->copy()->addYears($year);
                $calendarYear = $anniversaryDate->year;

                $exists = VacationEntitlement::where('employee_id', $employee->id)
                    ->where('year', $calendarYear)
                    ->exists();

                if ($exists) {
                    $skipped++;

                    continue;
                }

                $entitledDays = $this->rule->calculate($year);

                if (! $dryRun) {
                    VacationEntitlement::create([
                        'employee_id' => $employee->id,
                        'year' => $calendarYear,
                        'entitled_days' => $entitledDays,
                        'used_days' => 0,
                        'rule_key' => class_basename($this->rule),
                    ]);
                }

                $this->line("  ✓ Employee #{$employee->id} · year {$calendarYear} · {$entitledDays} days (seniority yr {$year})");
                $created++;
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
