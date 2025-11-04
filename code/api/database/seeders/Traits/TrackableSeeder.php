<?php

namespace Database\Seeders\Traits;

use App\Models\SeederLog;
use Illuminate\Database\Seeder;

trait TrackableSeeder
{
    protected function shouldLockAfterExecution(): bool
    {
        return false;
    }

    protected function shouldRunOnce(): bool
    {
        return true;
    }

    public function __invoke(array $parameters = []): void
    {
        $seederClass = get_class($this);
        $environment = app()->environment();
        $forceExecution = in_array('--force', $_SERVER['argv'] ?? []);

        if (SeederLog::isLocked($seederClass, $environment) && !$forceExecution) {
            $this->command->warn("⚠️  Seeder '{$seederClass}' is locked in '{$environment}' environment. Skipping...");
            return;
        }

        if ($this->shouldRunOnce() && SeederLog::hasRun($seederClass, $environment) && !$forceExecution) {
            $this->command->info("ℹ️  Seeder '" . class_basename($seederClass) . "' already executed. Skipping...");
            return;
        }

        $this->command->info("🌱 Running seeder: " . class_basename($seederClass));

        try {
            $this->run();

            SeederLog::markAsRun($seederClass, $environment, $this->shouldLockAfterExecution());

            if ($this->shouldLockAfterExecution()) {
                $this->command->info("🔒 Seeder locked: " . class_basename($seederClass));
            }
        } catch (\Exception $e) {
            $this->command->error("❌ Error in seeder '{$seederClass}': " . $e->getMessage());
            throw $e;
        }
    }

    public function getSeederClass(): string
    {
        return get_class($this);
    }
}
