<?php

namespace App\Console\Commands;

use App\Contracts\PasswordResetTokenRecorder;
use Database\Seeders\Fakes\FakeEmployeesSeeder;
use Database\Seeders\Testing\AttendanceTestSeeder;
use Database\Seeders\Testing\CloseDayHappyPathSeeder;
use Database\Seeders\Testing\CloseDayPendingLunchSeeder;
use Database\Seeders\Testing\CloseDayTestSeeder;
use Database\Seeders\Testing\CoreTestSeeder;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

class TestReset extends Command
{
    protected $signature = 'test:reset
        {--seeders= : Comma-separated seeder groups to run after truncation (e.g. attendance,inventory). Default: core only}
        {--list : List available seeder groups}';

    protected $description = 'Truncate all tables and re-seed with test data (fast alternative to migrate:fresh --seed)';

    /**
     * Available seeder groups mapped to their seeder classes.
     *
     * @var array<string, class-string[]>
     */
    private array $seederGroups = [
        'core' => [
            CoreTestSeeder::class,
        ],
        'attendance' => [
            AttendanceTestSeeder::class,
        ],
        'close-day' => [
            AttendanceTestSeeder::class,
            CloseDayTestSeeder::class,
        ],
        'close-day-happy' => [
            AttendanceTestSeeder::class,
            CloseDayHappyPathSeeder::class,
        ],
        'close-day-pending' => [
            AttendanceTestSeeder::class,
            CloseDayPendingLunchSeeder::class,
        ],
        'fakes-employees' => [
            FakeEmployeesSeeder::class,
        ],
    ];

    public function handle(): int
    {
        if (app()->environment('production')) {
            $this->error('⛔ test:reset is not allowed in production.');

            return self::FAILURE;
        }

        if ($this->option('list')) {
            return $this->listGroups();
        }

        $startTime = microtime(true);

        $this->info('🧹 Truncating all tables...');
        $this->truncateAllTables();
        $this->clearTestArtifacts();

        $groups = $this->resolveGroups();

        foreach ($groups as $group) {
            $seeders = $this->seederGroups[$group] ?? [];
            foreach ($seeders as $seederClass) {
                $shortName = class_basename($seederClass);
                $seederStart = microtime(true);

                $this->call('db:seed', ['--class' => $seederClass, '--force' => true]);

                $elapsed = round((microtime(true) - $seederStart) * 1000);
                $this->info("  ✓ {$shortName} ({$elapsed}ms)");
            }
        }

        $totalMs = round((microtime(true) - $startTime) * 1000);
        $this->newLine();
        $this->info("✅ test:reset completed in {$totalMs}ms (groups: " . implode(', ', $groups) . ')');

        return self::SUCCESS;
    }

    /**
     * Resolve which seeder groups to run.
     * Always includes 'core'. Additional groups come from --seeders option.
     *
     * @return string[]
     */
    private function resolveGroups(): array
    {
        $groups = ['core'];

        $extra = $this->option('seeders');
        if ($extra) {
            $requested = array_map('trim', explode(',', $extra));
            foreach ($requested as $group) {
                if (! isset($this->seederGroups[$group])) {
                    $this->warn("⚠️  Unknown seeder group '{$group}', skipping.");

                    continue;
                }
                if (! in_array($group, $groups)) {
                    $groups[] = $group;
                }
            }
        }

        return $groups;
    }

    /**
     * Truncate all application tables (preserving schema).
     * Skips Laravel system tables (migrations) and safely handles FK constraints.
     */
    private function truncateAllTables(): void
    {
        $skipTables = ['migrations'];

        DB::statement('SET session_replication_role = replica;');

        try {
            $tables = Schema::getTableListing();

            foreach ($tables as $table) {
                $tableName = str_contains($table, '.') ? substr(strrchr($table, '.'), 1) : $table;
                if (in_array($tableName, $skipTables)) {
                    continue;
                }
                DB::table($table)->truncate();
            }
        } finally {
            DB::statement('SET session_replication_role = DEFAULT;');
        }
    }

    /**
     * Clear test artifacts (reset link files, etc.) from storage/testing/.
     */
    private function clearTestArtifacts(): void
    {
        app(PasswordResetTokenRecorder::class)->clear();
    }

    private function listGroups(): int
    {
        $this->info('📋 Available seeder groups:');
        $this->newLine();

        foreach ($this->seederGroups as $name => $seeders) {
            $isCore = $name === 'core' ? ' (always included)' : '';
            $this->line("  <fg=yellow>{$name}</>{$isCore}");
            foreach ($seeders as $seeder) {
                $this->line('    → ' . class_basename($seeder));
            }
        }

        $this->newLine();
        $this->line('Usage: php artisan test:reset --seeders=attendance');

        return self::SUCCESS;
    }
}
