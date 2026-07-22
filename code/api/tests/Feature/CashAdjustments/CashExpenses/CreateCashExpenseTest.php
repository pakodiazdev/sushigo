<?php

namespace Tests\Feature\CashAdjustments\CashExpenses;

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

class CreateCashExpenseTest extends TestCase
{
    use RefreshDatabase;

    private CashSession $session;

    protected function setUp(): void
    {
        parent::setUp();

        $branch = Branch::factory()->create();
        $register = CashRegister::factory()->for($branch)->create();
        $this->session = CashSession::factory()
            ->for($register, 'cashRegister')
            ->draft()
            ->create();
    }

    private function actingAsUserWithPermission(): User
    {
        Permission::firstOrCreate(['name' => 'cash_expenses.create', 'guard_name' => 'api']);
        $role = Role::firstOrCreate(['name' => 'admin', 'guard_name' => 'api']);
        $role->givePermissionTo('cash_expenses.create');

        $user = User::factory()->create();
        $user->assignRole('admin');

        Passport::actingAs($user);

        return $user;
    }

    #[Test]
    public function it_creates_a_cash_expense(): void
    {
        $this->actingAsUserWithPermission();

        $response = $this->postJson('/api/v1/cash-expenses', [
            'cash_session_id' => $this->session->id,
            'tender_type' => 'CASH',
            'amount' => 150.00,
            'category' => 'SUPPLIES',
            'vendor' => 'Office Depot',
            'reference' => 'REC-001',
            'notes' => 'Office supplies',
        ]);

        $response->assertStatus(201)
            ->assertJson([
                'message' => 'Expense created successfully',
            ]);

        $this->assertDatabaseHas('cash_expenses', [
            'cash_session_id' => $this->session->id,
            'tender_type' => 'CASH',
            'category' => 'SUPPLIES',
        ]);
    }

    #[Test]
    public function it_rejects_unauthenticated_requests(): void
    {
        $response = $this->postJson('/api/v1/cash-expenses', [
            'cash_session_id' => $this->session->id,
            'tender_type' => 'CASH',
            'amount' => 150.00,
            'category' => 'SUPPLIES',
        ]);

        $response->assertStatus(401);
    }

    #[Test]
    public function it_rejects_users_without_permission(): void
    {
        $user = User::factory()->create();
        Passport::actingAs($user);

        $response = $this->postJson('/api/v1/cash-expenses', [
            'cash_session_id' => $this->session->id,
            'tender_type' => 'CASH',
            'amount' => 150.00,
            'category' => 'SUPPLIES',
        ]);

        $response->assertStatus(403);
    }
}
