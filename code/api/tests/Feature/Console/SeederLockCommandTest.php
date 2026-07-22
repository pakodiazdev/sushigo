<?php

namespace Tests\Feature\Console;

use App\Models\SeederLog;
use Illuminate\Foundation\Testing\RefreshDatabase;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class SeederLockCommandTest extends TestCase
{
    use RefreshDatabase;

    #[Test]
    public function it_fails_when_seeder_was_never_executed(): void
    {
        $this->artisan('seeder:lock', ['seeder' => 'NoSuchSeeder', '--environment' => 'testing'])
            ->expectsOutputToContain("Seeder 'NoSuchSeeder' not found in 'testing' environment.")
            ->assertExitCode(1);
    }

    #[Test]
    public function it_warns_when_seeder_is_already_locked(): void
    {
        SeederLog::create([
            'seeder_class' => 'Database\\Seeders\\Testing\\AlreadyLockedSeeder',
            'environment' => 'testing',
            'is_locked' => true,
            'executed_at' => now(),
            'locked_at' => now(),
        ]);

        $this->artisan('seeder:lock', ['seeder' => 'AlreadyLockedSeeder', '--environment' => 'testing'])
            ->expectsOutputToContain("Seeder 'AlreadyLockedSeeder' is already locked.")
            ->assertExitCode(0);
    }

    #[Test]
    public function it_locks_an_unlocked_seeder(): void
    {
        SeederLog::create([
            'seeder_class' => 'Database\\Seeders\\Testing\\UnlockedSeeder',
            'environment' => 'testing',
            'is_locked' => false,
            'executed_at' => now(),
        ]);

        $this->artisan('seeder:lock', [
            'seeder' => 'UnlockedSeeder',
            '--environment' => 'testing',
            '--notes' => 'locked for release',
        ])
            ->expectsOutputToContain("Seeder 'UnlockedSeeder' locked in 'testing' environment.")
            ->assertExitCode(0);

        $this->assertDatabaseHas('seeder_logs', [
            'seeder_class' => 'Database\\Seeders\\Testing\\UnlockedSeeder',
            'is_locked' => true,
            'notes' => 'locked for release',
        ]);
    }
}
