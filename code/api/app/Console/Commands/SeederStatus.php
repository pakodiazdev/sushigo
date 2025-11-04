<?php

namespace App\Console\Commands;

use App\Models\SeederLog;
use Illuminate\Console\Command;

class SeederStatus extends Command
{
    protected $signature = 'seeder:status {--environment= : Filter by environment}';

    protected $description = 'Show the status of executed seeders';

    public function handle(): int
    {
        $environment = $this->option('environment') ?? app()->environment();

        $this->info("📊 Seeder Status for Environment: <fg=yellow>{$environment}</>");
        $this->newLine();

        $logs = SeederLog::where('environment', $environment)
            ->orderBy('executed_at', 'desc')
            ->get();

        if ($logs->isEmpty()) {
            $this->warn("No seeders have been executed in '{$environment}' environment yet.");
            return self::SUCCESS;
        }

        $headers = ['Seeder', 'Status', 'Executed At', 'Locked At', 'Notes'];
        $rows = [];

        foreach ($logs as $log) {
            $status = $log->is_locked
                ? '<fg=red>🔒 Locked</>'
                : '<fg=green>✓ Executed</>';

            $rows[] = [
                class_basename($log->seeder_class),
                $status,
                $log->executed_at->diffForHumans(),
                $log->locked_at ? $log->locked_at->diffForHumans() : 'N/A',
                $log->notes ?? '-',
            ];
        }

        $this->table($headers, $rows);
        $this->newLine();

        $locked = $logs->where('is_locked', true)->count();
        $total = $logs->count();

        $this->info("Summary: {$total} seeders executed, {$locked} locked");

        return self::SUCCESS;
    }
}
