<?php

namespace Tests\Feature\CashAdjustments\CashRegisters;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Passport\Passport;
use PHPUnit\Framework\Attributes\Test;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

/**
 * Regression for #554: the `admin` role — as actually granted by every
 * environment's permission seeder (Testing/Development/Production) — never
 * included the Cash Adjustments module (cash_registers, cash_terminals,
 * cash_sessions, cash_adjustments, cash_expenses, bank_accounts), even though
 * the webapp's `checkPermission()` (auth.store.ts) unconditionally bypasses
 * every permission check for the `admin` role. That mismatch let an admin
 * reach the "Nueva Caja" UI while every request it made 403'd — the actual
 * cause of the CI-only `cash-register-code-suggestion.cy.ts` failure, not a
 * timing/browser flake.
 */
class AdminRoleCashAccessTest extends TestCase
{
    use RefreshDatabase;

    #[Test]
    public function the_seeded_admin_role_is_granted_every_cash_adjustments_permission(): void
    {
        $this->artisan('test:reset')->assertExitCode(0);

        $adminRole = Role::where('name', 'admin')->where('guard_name', 'api')->firstOrFail();

        foreach ([
            'cash_registers.view',
            'cash_registers.create',
            'cash_registers.update',
            'cash_registers.delete',
            'cash_terminals.view',
            'cash_terminals.create',
            'cash_terminals.update',
            'cash_terminals.delete',
            'cash_sessions.view',
            'cash_sessions.create',
            'cash_sessions.update',
            'cash_sessions.post',
            'cash_adjustments.view',
            'cash_adjustments.create',
            'cash_adjustments.update',
            'cash_adjustments.delete',
            'cash_adjustments.post',
            'cash_expenses.view',
            'cash_expenses.create',
            'cash_expenses.update',
            'cash_expenses.delete',
            'cash_expenses.post',
            'bank_accounts.view',
            'bank_accounts.create',
            'bank_accounts.update',
            'bank_accounts.delete',
        ] as $permission) {
            $this->assertTrue(
                $adminRole->hasPermissionTo($permission),
                "Expected the seeded 'admin' role to have the '{$permission}' permission."
            );
        }
    }

    #[Test]
    public function the_seeded_admin_user_can_reach_the_cash_registers_endpoints(): void
    {
        $this->artisan('test:reset')->assertExitCode(0);

        $admin = User::where('email', 'admin@sushigo.com')->firstOrFail();
        Passport::actingAs($admin);

        $this->getJson('/api/v1/cash-registers/next-code')
            ->assertOk()
            ->assertJsonPath('code', 'REG-001');

        $this->getJson('/api/v1/cash-registers')->assertOk();
    }
}
