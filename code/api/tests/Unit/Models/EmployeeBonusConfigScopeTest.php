<?php

namespace Tests\Unit\Models;

use App\Models\Employee;
use App\Models\EmployeeBonusConfig;
use App\Models\PunctualityBonusGroup;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use PHPUnit\Framework\Attributes\Test;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class EmployeeBonusConfigScopeTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        foreach (Employee::POSITION_ROLES as $roleName) {
            Role::firstOrCreate(['name' => $roleName, 'guard_name' => 'api']);
        }
    }

    #[Test]
    public function effective_scope_returns_config_active_on_date(): void
    {
        $group = PunctualityBonusGroup::create([
            'public_id' => '01GRPTEST01234567890001',
            'name' => 'Grupo $110', 'weekly_bonus_amount' => '110.00',
            'working_days_divisor' => 6, 'is_active' => true,
        ]);
        $employee = Employee::factory()->create();

        // active config: 2026-01-01 → (open)
        $active = EmployeeBonusConfig::create([
            'public_id' => '01CFGTEST01234567890001',
            'employee_id' => $employee->id,
            'punctuality_bonus_group_id' => $group->id,
            'effective_from' => '2026-01-01',
            'effective_to' => null,
        ]);

        // closed config: 2025-01-01 → 2025-12-31
        EmployeeBonusConfig::create([
            'public_id' => '01CFGTEST01234567890002',
            'employee_id' => $employee->id,
            'punctuality_bonus_group_id' => $group->id,
            'effective_from' => '2025-01-01',
            'effective_to' => '2025-12-31',
        ]);

        $result = EmployeeBonusConfig::effective(Carbon::parse('2026-04-01'))->get();

        $this->assertCount(1, $result);
        $this->assertEquals($active->id, $result->first()->id);
    }

    #[Test]
    public function effective_scope_excludes_future_configs(): void
    {
        $group = PunctualityBonusGroup::create([
            'public_id' => '01GRPTEST01234567890003',
            'name' => 'Grupo $100', 'weekly_bonus_amount' => '100.00',
            'working_days_divisor' => 6, 'is_active' => true,
        ]);
        $employee = Employee::factory()->create();

        EmployeeBonusConfig::create([
            'public_id' => '01CFGTEST01234567890003',
            'employee_id' => $employee->id,
            'punctuality_bonus_group_id' => $group->id,
            'effective_from' => '2026-06-01',
            'effective_to' => null,
        ]);

        $result = EmployeeBonusConfig::effective(Carbon::parse('2026-04-01'))->get();

        $this->assertCount(0, $result);
    }
}
