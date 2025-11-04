<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;

class SeedersInfo extends Command
{
    protected $signature = 'seeders:info';

    protected $description = 'Display information about available seeders for current environment';

    public function handle(): int
    {
        $environment = app()->environment();
        $environments = config('seeders.environments', []);

        $this->info("📊 Seeders Information");
        $this->newLine();

        $this->info("🌍 Current Environment: <fg=yellow>{$environment}</>");
        $this->newLine();

        if (isset($environments[$environment])) {
            $seederClass = $environments[$environment];
            $this->info("✓ Seeder Class: <fg=green>{$seederClass}</>");
        } else {
            $this->warn("⚠ No seeder configured for this environment");
        }
        $this->newLine();

        $this->info("📋 Configured Environments:");
        $this->newLine();

        $headers = ['Environment', 'Seeder Class'];
        $rows = [];

        foreach ($environments as $env => $seeder) {
            $rows[] = [
                $env === $environment ? "<fg=green>{$env}</>" : $env,
                class_basename($seeder),
            ];
        }

        $this->table($headers, $rows);
        $this->newLine();

        if ($environment !== 'production') {
            $users = config('seeders.development_users', []);

            if (!empty($users)) {
                $this->info("👥 Development Users:");
                $this->newLine();

                $userHeaders = ['Name', 'Email', 'Password', 'Role'];
                $userRows = [];

                foreach ($users as $user) {
                    $userRows[] = [
                        $user['name'],
                        $user['email'],
                        str_repeat('*', strlen($user['password'])),
                        $user['role'] ?? 'N/A',
                    ];
                }

                $this->table($userHeaders, $userRows);
                $this->newLine();
            }

            $factoryCounts = config('seeders.factory_counts', []);
            if (!empty($factoryCounts)) {
                $this->info("🏭 Factory Counts:");
                foreach ($factoryCounts as $entity => $count) {
                    $this->line("  • {$entity}: <fg=yellow>{$count}</>");
                }
                $this->newLine();
            }
        }

        $this->info("💡 Useful Commands:");
        $this->line("  • Run seeders: <fg=cyan>php artisan db:seed</>");
        $this->line("  • Fresh migration + seed: <fg=cyan>php artisan migrate:fresh --seed</>");
        $this->line("  • Specific seeder: <fg=cyan>php artisan db:seed --class=SeederClass</>");
        $this->newLine();

        return self::SUCCESS;
    }
}
