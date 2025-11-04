<?php

namespace App\Console\Commands;

use App\Models\SeederLog;
use Illuminate\Console\Command;

class SeederLock extends Command
{
    protected $signature = 'seeder:lock {seeder : The seeder class name (short or full)} {--environment= : Environment to lock in} {--notes= : Optional notes}';

    protected $description = 'Lock a seeder to prevent re-execution';

    public function handle(): int
    {
        $environment = $this->option('environment') ?? app()->environment();
        $seederName = $this->argument('seeder');
        $notes = $this->option('notes');

        $log = $this->findSeeder($seederName, $environment);

        if (!$log) {
            $this->error("Seeder '{$seederName}' not found in '{$environment}' environment.");
            $this->warn("The seeder must be executed at least once before it can be locked.");
            return self::FAILURE;
        }

        if ($log->is_locked) {
            $this->warn("Seeder '{$seederName}' is already locked.");
            return self::SUCCESS;
        }

        if (SeederLog::lock($log->seeder_class, $environment, $notes)) {
            $this->info("✓ Seeder '{$seederName}' locked in '{$environment}' environment.");
            $this->info("This seeder will not run again automatically.");
            return self::SUCCESS;
        }

        $this->error("Failed to lock seeder '{$seederName}'.");
        return self::FAILURE;
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
