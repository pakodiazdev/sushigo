<?php

namespace Tests\Feature\CashAdjustments\CashAdjustments;

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

class CreateCashAdjustmentTest extends TestCase
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
        Permission::firstOrCreate(['name' => 'cash_adjustments.create', 'guard_name' => 'api']);
        $role = Role::firstOrCreate(['name' => 'admin', 'guard_name' => 'api']);
        $role->givePermissionTo('cash_adjustments.create');

        $user = User::factory()->create();
        $user->assignRole('admin');

        Passport::actingAs($user);

        return $user;
    }

    #[Test]
    public function it_rejects_a_card_line_without_terminal(): void
    {
        $this->actingAsUserWithPermission();

        $response = $this->postJson('/api/v1/cash-adjustments', [
            'cash_session_id' => $this->session->id,
            'type' => 'CORRECTION',
            'direction' => 'INFLOW',
            'lines' => [
                ['tender_type' => 'CARD', 'amount' => 100.00],
            ],
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors([
                'lines.0.card_terminal_id' => 'El terminal de tarjeta es requerido para tender tipo CARD',
            ]);
    }

    #[Test]
    public function it_rejects_a_transfer_line_without_bank_account(): void
    {
        $this->actingAsUserWithPermission();

        $response = $this->postJson('/api/v1/cash-adjustments', [
            'cash_session_id' => $this->session->id,
            'type' => 'CORRECTION',
            'direction' => 'INFLOW',
            'lines' => [
                ['tender_type' => 'TRANSFER', 'amount' => 100.00],
            ],
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors([
                'lines.0.bank_account_id' => 'La cuenta bancaria es requerida para tender tipo TRANSFER',
            ]);
    }
}
