<?php

namespace App\Console\Commands;

use App\Models\SeederLog;
use Illuminate\Console\Command;

class SeederUnlock extends Command
{
    protected $signature = 'seeder:unlock {seeder : The seeder class name (short or full)} {--environment= : Environment to unlock in} {--all : Unlock all seeders}';

    protected $description = 'Unlock a seeder to allow re-execution';

    public function handle(): int
    {
        $environment = $this->option('environment') ?? app()->environment();
        $unlockAll = $this->option('all');

        if ($unlockAll) {
            return $this->unlockAll($environment);
        }

        $seederName = $this->argument('seeder');

        $log = $this->findSeeder($seederName, $environment);

        if (!$log) {
            $this->error("Seeder '{$seederName}' not found in '{$environment}' environment.");
            return self::FAILURE;
        }

        if (!$log->is_locked) {
            $this->warn("Seeder '{$seederName}' is not locked.");
            return self::SUCCESS;
        }

        if (SeederLog::unlock($log->seeder_class, $environment)) {
            $this->info("✓ Seeder '{$seederName}' unlocked in '{$environment}' environment.");
            $this->warn("⚠️  This seeder will run again on next execution!");
            return self::SUCCESS;
        }

        $this->error("Failed to unlock seeder '{$seederName}'.");
        return self::FAILURE;
    }

    private function unlockAll(string $environment): int
    {
        if (!$this->confirm("Are you sure you want to unlock ALL seeders in '{$environment}' environment?")) {
            $this->info('Operation cancelled.');
            return self::SUCCESS;
        }

        $count = SeederLog::where('environment', $environment)
            ->where('is_locked', true)
            ->update([
                'is_locked' => false,
                'locked_at' => null,
            ]);

        $this->info("✓ Unlocked {$count} seeder(s) in '{$environment}' environment.");

        if ($count > 0) {
            $this->warn("⚠️  These seeders will run again on next execution!");
        }

        return self::SUCCESS;
    }

    private function findSeeder(string $name, string $environment): ?SeederLog
    {
        $log = SeederLog::where('environment', $environment)
            ->where('seeder_class', 'like', "%{$name}")
            ->first();

        if ($log) {
            return $log;
        }

        return SeederLog::where('environment', $environment)
            ->get()
            ->first(function ($log) use ($name) {
                return class_basename($log->seeder_class) === $name;
            });
    }
}
