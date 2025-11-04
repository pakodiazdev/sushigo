<?php

namespace Database\Seeders;

use Database\Seeders\Development\DevelopmentSeeder;
use Database\Seeders\Production\ProductionSeeder;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    public function run(): void
    {
        $environment = app()->environment();
        $environments = config('seeders.environments', []);

        $this->command->info("🌱 Running seeders for environment: {$environment}");

        if (isset($environments[$environment])) {
            $seederClass = $environments[$environment];
            $this->call($seederClass);
        } else {
            $this->command->warn("⚠️  No specific seeder configured for environment: {$environment}");
            $this->command->warn("⚠️  Add seeder in config/seeders.php");
        }

        $this->command->info("✅ Seeding completed for environment: {$environment}");
    }
}
