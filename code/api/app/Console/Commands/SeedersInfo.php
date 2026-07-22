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

        $this->info('📊 Seeders Information');
        $this->newLine();

        $this->displayCurrentEnvironment($environment, $environments);
        $this->displayConfiguredEnvironments($environment, $environments);

        if ($environment !== 'production') {
            $this->displayDevelopmentUsers();
            $this->displayFactoryCounts();
        }

        $this->displayUsefulCommands();

        return self::SUCCESS;
    }

    private function displayCurrentEnvironment(string $environment, array $environments): void
    {
        $this->info("🌍 Current Environment: <fg=yellow>{$environment}</>");
        $this->newLine();

        if (isset($environments[$environment])) {
            $this->info("✓ Seeder Class: <fg=green>{$environments[$environment]}</>");
        } else {
            $this->warn('⚠ No seeder configured for this environment');
        }
        $this->newLine();
    }

    private function displayConfiguredEnvironments(string $environment, array $environments): void
    {
        $this->info('📋 Configured Environments:');
        $this->newLine();

        $rows = [];
        foreach ($environments as $env => $seeder) {
            $rows[] = [
                $env === $environment ? "<fg=green>{$env}</>" : $env,
                class_basename($seeder),
            ];
        }

        $this->table(['Environment', 'Seeder Class'], $rows);
        $this->newLine();
    }

    private function displayDevelopmentUsers(): void
    {
        $users = config('seeders.development_users', []);

        if (empty($users)) {
            return;
        }

        $this->info('👥 Development Users:');
        $this->newLine();

        $userRows = [];
        foreach ($users as $user) {
            $name = trim(($user['first_name'] ?? '').' '.($user['last_name'] ?? ''));
            $userRows[] = [
                $name !== '' ? $name : 'N/A',
                $user['email'],
                str_repeat('*', strlen($user['password'])),
                $user['role'] ?? 'N/A',
            ];
        }

        $this->table(['Name', 'Email', 'Password', 'Role'], $userRows);
        $this->newLine();
    }

    private function displayFactoryCounts(): void
    {
        $factoryCounts = config('seeders.factory_counts', []);

        if (empty($factoryCounts)) {
            return;
        }

        $this->info('🏭 Factory Counts:');
        foreach ($factoryCounts as $entity => $count) {
            $this->line("  • {$entity}: <fg=yellow>{$count}</>");
        }
        $this->newLine();
    }

    private function displayUsefulCommands(): void
    {
        $this->info('💡 Useful Commands:');
        $this->line('  • Run seeders: <fg=cyan>php artisan db:seed</>');
        $this->line('  • Fresh migration + seed: <fg=cyan>php artisan migrate:fresh --seed</>');
        $this->line('  • Specific seeder: <fg=cyan>php artisan db:seed --class=SeederClass</>');
        $this->newLine();
    }
}
