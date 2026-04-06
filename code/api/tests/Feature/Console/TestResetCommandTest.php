<?php

namespace Tests\Feature\Console;

use App\Contracts\PasswordResetTokenRecorder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class TestResetCommandTest extends TestCase
{
    use RefreshDatabase;

    // ── Production guard ───────────────────────────────────────────────

    #[Test]
    public function refuses_to_run_in_production_environment(): void
    {
        app()->detectEnvironment(fn () => 'production');

        $this->artisan('test:reset')
            ->expectsOutputToContain('not allowed in production')
            ->assertExitCode(1);
    }

    // ── --list option ────────────────────────────────────────────────────

    #[Test]
    public function list_option_shows_available_seeder_groups(): void
    {
        $this->artisan('test:reset', ['--list' => true])
            ->expectsOutputToContain('Available seeder groups')
            ->expectsOutputToContain('core')
            ->expectsOutputToContain('attendance')
            ->expectsOutputToContain('fakes-employees')
            ->expectsOutputToContain('CoreTestSeeder')
            ->expectsOutputToContain('AttendanceTestSeeder')
            ->expectsOutputToContain('FakeEmployeesSeeder')
            ->assertExitCode(0);
    }

    #[Test]
    public function list_option_shows_usage_hint(): void
    {
        $this->artisan('test:reset', ['--list' => true])
            ->expectsOutputToContain('Usage: php artisan test:reset --seeders=attendance')
            ->assertExitCode(0);
    }

    // ── Core-only execution (default) ────────────────────────────────────

    #[Test]
    public function runs_core_seeders_by_default(): void
    {
        $this->artisan('test:reset')
            ->expectsOutputToContain('Truncating all tables')
            ->expectsOutputToContain('CoreTestSeeder')
            ->expectsOutputToContain('test:reset completed')
            ->assertExitCode(0);

        // Verify core data was seeded
        $this->assertDatabaseHas('roles', ['name' => 'super-admin', 'guard_name' => 'api']);
        $this->assertDatabaseHas('roles', ['name' => 'admin', 'guard_name' => 'api']);
        $this->assertDatabaseHas('users', ['email' => 'superadmin@sushigo.com']);
        $this->assertDatabaseHas('users', ['email' => 'admin@sushigo.com']);
        $this->assertDatabaseHas('branches', ['code' => 'MAIN']);
        $this->assertDatabaseHas('operating_units', ['type' => 'BRANCH_MAIN']);
    }

    #[Test]
    public function truncates_existing_data_before_seeding(): void
    {
        // Pre-populate a table with data
        DB::table('roles')->insert([
            'name' => 'test-role-to-be-truncated',
            'guard_name' => 'api',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $this->assertDatabaseHas('roles', ['name' => 'test-role-to-be-truncated']);

        $this->artisan('test:reset')->assertExitCode(0);

        // Old data should be gone
        $this->assertDatabaseMissing('roles', ['name' => 'test-role-to-be-truncated']);
        // But seeded data should exist
        $this->assertDatabaseHas('roles', ['name' => 'super-admin']);
    }

    #[Test]
    public function preserves_migrations_table(): void
    {
        $migrationsBefore = DB::table('migrations')->count();
        $this->assertGreaterThan(0, $migrationsBefore);

        $this->artisan('test:reset')->assertExitCode(0);

        $migrationsAfter = DB::table('migrations')->count();
        $this->assertEquals($migrationsBefore, $migrationsAfter);
    }

    // ── --seeders option ─────────────────────────────────────────────────

    #[Test]
    public function runs_additional_seeder_groups_when_specified(): void
    {
        $this->artisan('test:reset', ['--seeders' => 'attendance'])
            ->expectsOutputToContain('CoreTestSeeder')
            ->expectsOutputToContain('AttendanceTestSeeder')
            ->expectsOutputToContain('test:reset completed')
            ->assertExitCode(0);

        // Verify attendance-specific data was seeded
        $this->assertDatabaseHas('employees', ['code' => 'ADM-001']);
        $this->assertDatabaseHas('employees', ['code' => 'ADM-002']);
        $this->assertTrue(DB::table('employee_schedules')->count() > 0);
        $this->assertTrue(DB::table('schedule_days')->count() > 0);
    }

    #[Test]
    public function warns_and_skips_unknown_seeder_groups(): void
    {
        $this->artisan('test:reset', ['--seeders' => 'nonexistent'])
            ->expectsOutputToContain("Unknown seeder group 'nonexistent'")
            ->expectsOutputToContain('CoreTestSeeder')
            ->assertExitCode(0);
    }

    #[Test]
    public function handles_mixed_valid_and_invalid_seeder_groups(): void
    {
        $this->artisan('test:reset', ['--seeders' => 'attendance,nonexistent'])
            ->expectsOutputToContain("Unknown seeder group 'nonexistent'")
            ->expectsOutputToContain('CoreTestSeeder')
            ->expectsOutputToContain('AttendanceTestSeeder')
            ->assertExitCode(0);
    }

    #[Test]
    public function does_not_duplicate_core_if_explicitly_requested(): void
    {
        $this->artisan('test:reset', ['--seeders' => 'core'])
            ->assertExitCode(0);

        // Core should only run once — roles should not be duplicated
        $superAdminCount = DB::table('roles')
            ->where('name', 'super-admin')
            ->where('guard_name', 'api')
            ->count();

        $this->assertEquals(1, $superAdminCount);
    }

    // ── Output formatting ────────────────────────────────────────────────

    #[Test]
    public function output_includes_timing_information(): void
    {
        $this->artisan('test:reset')
            ->expectsOutputToContain('completed in')
            ->assertExitCode(0);
    }

    #[Test]
    public function output_includes_all_groups_in_summary(): void
    {
        $this->artisan('test:reset', ['--seeders' => 'attendance'])
            ->expectsOutputToContain('groups: core, attendance')
            ->assertExitCode(0);
    }

    // ── Truncation behavior ──────────────────────────────────────────────

    #[Test]
    public function truncates_all_application_tables(): void
    {
        // Run once to populate data
        $this->artisan('test:reset', ['--seeders' => 'attendance'])->assertExitCode(0);

        // Verify data exists
        $this->assertTrue(DB::table('users')->count() > 0);
        $this->assertTrue(DB::table('roles')->count() > 0);

        // Run again — old data gets truncated, then re-seeded
        $this->artisan('test:reset')->assertExitCode(0);

        // Core data should exist (freshly seeded)
        $this->assertDatabaseHas('users', ['email' => 'admin@sushigo.com']);
        // Attendance data should NOT exist (only core was requested)
        $this->assertDatabaseMissing('employees', ['code' => 'ADM-001']);
    }

    // ── Test artifact cleanup ──────────────────────────────────────────────

    #[Test]
    public function clears_test_artifacts_on_reset(): void
    {
        config(['app.log_reset_link' => true]);

        // Create a test artifact via the recorder
        $recorder = app(PasswordResetTokenRecorder::class);
        $recorder->record('test-cleanup@example.com', 'https://example.com/reset?token=abc123');

        // Verify file was created
        $this->assertNotNull($recorder->retrieve('test-cleanup@example.com'));

        // Run test:reset — should clear artifacts
        $this->artisan('test:reset')->assertExitCode(0);

        // Verify artifact was cleaned up
        $this->assertNull($recorder->retrieve('test-cleanup@example.com'));
    }

    // ── FK constraint handling ────────────────────────────────────────────

    #[Test]
    public function handles_foreign_key_constraints_during_truncation(): void
    {
        // Run with attendance (which creates FK-linked data: employees → users, schedules → periods)
        $this->artisan('test:reset', ['--seeders' => 'attendance'])->assertExitCode(0);

        // Run again to verify truncation works even with FK constraints
        $this->artisan('test:reset', ['--seeders' => 'attendance'])
            ->assertExitCode(0);

        $this->assertDatabaseHas('employees', ['code' => 'ADM-001']);
    }
}
