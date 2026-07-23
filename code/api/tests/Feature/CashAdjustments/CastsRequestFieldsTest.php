<?php

namespace Tests\Feature\CashAdjustments;

use App\Models\Branch;
use App\Models\CashRegister;
use App\Models\CashSession;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Passport\Passport;
use PHPUnit\Framework\Attributes\Test;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class CastsRequestFieldsTest extends TestCase
{
    use RefreshDatabase;

    private Branch $branch;

    protected function setUp(): void
    {
        parent::setUp();

        $permissions = [
            'bank_accounts.create',
            'cash_registers.create',
            'cash_terminals.create',
            'cash_sessions.create',
            'cash_expenses.create',
        ];

        foreach ($permissions as $name) {
            Permission::firstOrCreate(['name' => $name, 'guard_name' => 'api']);
        }

        $role = Role::firstOrCreate(['name' => 'cash-manager', 'guard_name' => 'api']);
        $role->syncPermissions($permissions);

        $user = User::factory()->create();
        $user->assignRole('cash-manager');

        Passport::actingAs($user);

        $this->branch = Branch::factory()->create();
    }

    #[Test]
    public function bank_account_create_casts_string_boolean(): void
    {
        $this->postJson('/api/v1/bank-accounts', [
            'branch_id' => $this->branch->id,
            'alias' => 'Cuenta Principal',
            'bank_name' => 'BBVA',
            'account_number_masked' => '****1234',
            'is_active' => 'false',
        ])
            ->assertStatus(201)
            ->assertJsonPath('data.is_active', false);

        $this->assertDatabaseHas('bank_accounts', [
            'alias' => 'Cuenta Principal',
            'is_active' => false,
        ]);
    }

    #[Test]
    public function cash_register_create_casts_string_boolean(): void
    {
        $this->postJson('/api/v1/cash-registers', [
            'branch_id' => $this->branch->id,
            'code' => 'REG-100',
            'name' => 'Caja Principal',
            'type' => 'ON_PREMISE',
            'is_active' => '0',
        ])
            ->assertStatus(201)
            ->assertJsonPath('data.is_active', false);

        $this->assertDatabaseHas('cash_registers', [
            'code' => 'REG-100',
            'is_active' => false,
        ]);
    }

    #[Test]
    public function cash_terminal_create_casts_string_boolean(): void
    {
        $this->postJson('/api/v1/cash-terminals', [
            'branch_id' => $this->branch->id,
            'name' => 'Terminal CLIP',
            'provider' => 'CLIP',
            'account_ref' => 'ACC-001',
            'last_four' => '1234',
            'is_active' => 'true',
        ])
            ->assertStatus(201)
            ->assertJsonPath('data.is_active', true);

        $this->assertDatabaseHas('cash_terminals', [
            'name' => 'Terminal CLIP',
            'is_active' => true,
        ]);
    }

    #[Test]
    public function cash_session_create_casts_string_opening_balance_to_float(): void
    {
        $register = CashRegister::factory()->create(['branch_id' => $this->branch->id]);

        $this->postJson('/api/v1/cash-sessions', [
            'cash_register_id' => $register->id,
            'operating_date' => '2026-01-05',
            'opening_balance' => '1500.50',
        ])
            ->assertStatus(201)
            ->assertJsonPath('data.opening_balance', '1500.5000');

        $this->assertDatabaseHas('cash_sessions', [
            'cash_register_id' => $register->id,
            'opening_balance' => 1500.50,
        ]);
    }

    #[Test]
    public function cash_expense_create_casts_string_amount_to_float(): void
    {
        $register = CashRegister::factory()->create(['branch_id' => $this->branch->id]);
        $session = CashSession::factory()->create(['cash_register_id' => $register->id]);

        $this->postJson('/api/v1/cash-expenses', [
            'cash_session_id' => $session->id,
            'tender_type' => 'CASH',
            'amount' => '250.75',
            'category' => 'SUPPLIES',
            'vendor' => 'Office Depot',
        ])
            ->assertStatus(201)
            ->assertJsonPath('data.amount', '250.7500');

        $this->assertDatabaseHas('cash_expenses', [
            'cash_session_id' => $session->id,
            'amount' => 250.75,
        ]);
    }
}
