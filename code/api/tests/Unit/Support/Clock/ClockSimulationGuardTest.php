<?php

namespace Tests\Unit\Support\Clock;

use App\Exceptions\ClockSimulationMisconfigurationException;
use App\Support\Clock\ClockSimulationGuard;
use Illuminate\Support\Facades\Config;
use Tests\TestCase;

class ClockSimulationGuardTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();

        // Default config for tests
        Config::set('clock.simulation_enabled', true);
        Config::set('clock.allowed_environments', 'local,devtest,testing');
    }

    public function test_validate_passes_when_enabled_and_environment_allowed(): void
    {
        Config::set('clock.simulation_enabled', true);
        Config::set('clock.allowed_environments', 'testing');

        // Should not throw or abort
        ClockSimulationGuard::validate();

        $this->assertTrue(true); // Reached here means validation passed
    }

    public function test_validate_aborts_404_when_simulation_disabled(): void
    {
        Config::set('clock.simulation_enabled', false);
        Config::set('clock.allowed_environments', 'testing');

        $this->expectException(\Symfony\Component\HttpKernel\Exception\HttpException::class);

        ClockSimulationGuard::validate();
    }

    public function test_validate_aborts_404_when_environment_not_allowed(): void
    {
        Config::set('clock.simulation_enabled', true);
        Config::set('clock.allowed_environments', 'local,devtest'); // testing not in list

        $this->expectException(\Symfony\Component\HttpKernel\Exception\HttpException::class);

        ClockSimulationGuard::validate();
    }

    public function test_validate_throws_misconfiguration_exception_when_production_in_allowed_envs(): void
    {
        Config::set('clock.simulation_enabled', true);
        Config::set('clock.allowed_environments', 'local,production');

        $this->expectException(ClockSimulationMisconfigurationException::class);
        $this->expectExceptionMessage('must not contain "production"');

        ClockSimulationGuard::validate();
    }

    public function test_validate_handles_mixed_case_environments(): void
    {
        Config::set('clock.simulation_enabled', true);
        Config::set('clock.allowed_environments', 'LOCAL,DevTest,TESTING');

        // Should normalize and pass (current env is 'testing')
        ClockSimulationGuard::validate();

        $this->assertTrue(true);
    }

    public function test_validate_handles_whitespace_in_environment_list(): void
    {
        Config::set('clock.simulation_enabled', true);
        Config::set('clock.allowed_environments', ' local , testing , devtest ');

        ClockSimulationGuard::validate();

        $this->assertTrue(true);
    }

    public function test_validate_handles_empty_allowed_environments(): void
    {
        Config::set('clock.simulation_enabled', true);
        Config::set('clock.allowed_environments', '');

        $this->expectException(\Symfony\Component\HttpKernel\Exception\HttpException::class);

        ClockSimulationGuard::validate();
    }
}
