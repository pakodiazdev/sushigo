<?php

namespace Tests\Unit\Services;

use App\Models\Employee;
use App\Models\VacationPolicySetting;
use App\Models\VacationPolicyTier;
use App\Services\VacationEntitlementResolver;
use App\Services\VacationRules\CustomVacationPolicy;
use App\Services\VacationRules\VacationsLFTMX;
use Illuminate\Foundation\Testing\RefreshDatabase;
use PHPUnit\Framework\Attributes\Test;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class VacationEntitlementResolverTest extends TestCase
{
    use RefreshDatabase;

    private VacationEntitlementResolver $resolver;

    protected function setUp(): void
    {
        parent::setUp();

        foreach (Employee::POSITION_ROLES as $role) {
            Role::firstOrCreate(['name' => $role, 'guard_name' => 'api']);
        }

        $this->resolver = new VacationEntitlementResolver;
    }

    #[Test]
    public function it_resolves_lft_by_default_with_no_settings_configured(): void
    {
        $employee = Employee::factory()->create();

        $rule = $this->resolver->resolve($employee);

        $this->assertInstanceOf(VacationsLFTMX::class, $rule);
        $this->assertSame('VacationsLFTMX', $rule->key());
    }

    #[Test]
    public function it_resolves_the_tenant_custom_policy_when_active_and_tiers_exist(): void
    {
        VacationPolicySetting::query()->create(['active_rule_key' => 'CustomCompanyPolicy']);
        VacationPolicyTier::create(['years_from' => 1, 'days' => 18, 'sort_order' => 1]);
        VacationPolicyTier::create(['years_from' => 5, 'days' => 25, 'sort_order' => 2]);

        $employee = Employee::factory()->create();

        $rule = $this->resolver->resolve($employee);

        $this->assertInstanceOf(CustomVacationPolicy::class, $rule);
        $this->assertSame('CustomCompanyPolicy', $rule->key());
        $this->assertSame(18, $rule->calculate(1));
        $this->assertSame(25, $rule->calculate(5));
    }

    #[Test]
    public function it_falls_back_to_lft_when_custom_policy_is_active_but_has_no_tiers(): void
    {
        VacationPolicySetting::query()->create(['active_rule_key' => 'CustomCompanyPolicy']);

        $employee = Employee::factory()->create();

        $rule = $this->resolver->resolve($employee);

        $this->assertInstanceOf(VacationsLFTMX::class, $rule);
    }

    #[Test]
    public function employee_contractual_override_takes_precedence_over_tenant_custom_policy(): void
    {
        VacationPolicySetting::query()->create(['active_rule_key' => 'CustomCompanyPolicy']);
        VacationPolicyTier::create(['years_from' => 1, 'days' => 18, 'sort_order' => 1]);

        $employee = Employee::factory()->create([
            'vacation_entitlement_rule_key' => 'ContractualPolicy',
            'vacation_entitlement_custom_table' => [
                ['years_from' => 1, 'days' => 30],
            ],
        ]);

        $rule = $this->resolver->resolve($employee);

        $this->assertInstanceOf(CustomVacationPolicy::class, $rule);
        $this->assertSame('ContractualPolicy', $rule->key());
        $this->assertSame(30, $rule->calculate(1));
    }

    #[Test]
    public function employee_override_key_without_a_table_falls_back_to_tenant_resolution(): void
    {
        $employee = Employee::factory()->create([
            'vacation_entitlement_rule_key' => 'ContractualPolicy',
            'vacation_entitlement_custom_table' => null,
        ]);

        $rule = $this->resolver->resolve($employee);

        $this->assertInstanceOf(VacationsLFTMX::class, $rule);
    }
}
