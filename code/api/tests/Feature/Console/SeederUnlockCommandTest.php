<?php

namespace Tests\Feature\Console;

use App\Models\SeederLog;
use Illuminate\Foundation\Testing\RefreshDatabase;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class SeederUnlockCommandTest extends TestCase
{
    use RefreshDatabase;

    #[Test]
    public function it_fails_when_seeder_was_never_executed(): void
    {
        $this->artisan('seeder:unlock', ['seeder' => 'NoSuchSeeder', '--environment' => 'testing'])
            ->expectsOutputToContain("Seeder 'NoSuchSeeder' not found in 'testing' environment.")
            ->assertExitCode(1);
    }

    #[Test]
    public function it_warns_when_seeder_is_not_locked(): void
    {
        SeederLog::create([
            'seeder_class' => 'Database\\Seeders\\Testing\\AlreadyUnlockedSeeder',
            'environment' => 'testing',
            'is_locked' => false,
            'executed_at' => now(),
        ]);

        $this->artisan('seeder:unlock', ['seeder' => 'AlreadyUnlockedSeeder', '--environment' => 'testing'])
            ->expectsOutputToContain("Seeder 'AlreadyUnlockedSeeder' is not locked.")
            ->assertExitCode(0);
    }

    #[Test]
    public function it_unlocks_a_locked_seeder(): void
    {
        SeederLog::create([
            'seeder_class' => 'Database\\Seeders\\Testing\\LockedSeeder',
            'environment' => 'testing',
            'is_locked' => true,
            'executed_at' => now(),
            'locked_at' => now(),
        ]);

        $this->artisan('seeder:unlock', ['seeder' => 'LockedSeeder', '--environment' => 'testing'])
            ->expectsOutputToContain("Seeder 'LockedSeeder' unlocked in 'testing' environment.")
            ->assertExitCode(0);

        $this->assertDatabaseHas('seeder_logs', [
            'seeder_class' => 'Database\\Seeders\\Testing\\LockedSeeder',
            'is_locked' => false,
        ]);
    }

    #[Test]
    public function it_unlocks_all_seeders_with_all_option(): void
    {
        SeederLog::create([
            'seeder_class' => 'Database\\Seeders\\Testing\\LockedSeederOne',
            'environment' => 'testing',
            'is_locked' => true,
            'executed_at' => now(),
            'locked_at' => now(),
        ]);
        SeederLog::create([
            'seeder_class' => 'Database\\Seeders\\Testing\\LockedSeederTwo',
            'environment' => 'testing',
            'is_locked' => true,
            'executed_at' => now(),
            'locked_at' => now(),
        ]);

        $this->artisan('seeder:unlock', ['seeder' => 'unused', '--environment' => 'testing', '--all' => true])
            ->expectsConfirmation("Are you sure you want to unlock ALL seeders in 'testing' environment?", 'yes')
            ->expectsOutputToContain("Unlocked 2 seeder(s) in 'testing' environment.")
            ->assertExitCode(0);

        $this->assertDatabaseHas('seeder_logs', [
            'seeder_class' => 'Database\\Seeders\\Testing\\LockedSeederOne',
            'is_locked' => false,
        ]);
        $this->assertDatabaseHas('seeder_logs', [
            'seeder_class' => 'Database\\Seeders\\Testing\\LockedSeederTwo',
            'is_locked' => false,
        ]);
    }
}
