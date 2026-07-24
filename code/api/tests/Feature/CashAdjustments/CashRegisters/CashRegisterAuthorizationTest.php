<?php

namespace Tests\Feature\CashAdjustments\CashRegisters;

use App\Models\Branch;
use App\Models\CashRegister;
use App\Models\CashSession;
use Illuminate\Foundation\Testing\RefreshDatabase;
use PHPUnit\Framework\Attributes\Test;
use Tests\Feature\CashAdjustments\Concerns\SetsUpBranchAccess;
use Tests\TestCase;

/**
 * Regression coverage for #291: Show/Update/Delete previously operated on a
 * blank model (route segment {id} didn't match the CashRegister $cashRegister
 * binding) with no resource-level authorization at all.
 *
 * Also covers #293: SerializesPublicIdAsId must apply to paginated List
 * responses and nested relations (e.g. sessions), not just Show/Update.
 */
class CashRegisterAuthorizationTest extends TestCase
{
    use RefreshDatabase;
    use SetsUpBranchAccess;

    #[Test]
    public function show_returns_the_actual_requested_register(): void
    {
        $branch = Branch::factory()->create();
        $register = CashRegister::factory()->for($branch)->create(['name' => 'Caja Real']);
        $this->actingAsUserWithBranchAccess($branch, 'cash_registers.view');

        $response = $this->getJson("/api/v1/cash-registers/{$register->public_id}");

        $response->assertStatus(200)
            ->assertJsonPath('data.id', $register->public_id)
            ->assertJsonPath('data.name', 'Caja Real')
            ->assertJsonPath('data.branch.id', $branch->id)
            ->assertJsonMissingPath('data.public_id');
    }

    #[Test]
    public function show_includes_ulid_ids_for_the_nested_sessions_relation(): void
    {
        $branch = Branch::factory()->create();
        $register = CashRegister::factory()->for($branch)->create();
        $session = CashSession::factory()->for($register, 'cashRegister')->draft()->create();
        $this->actingAsUserWithBranchAccess($branch, 'cash_registers.view');

        $response = $this->getJson("/api/v1/cash-registers/{$register->public_id}");

        $response->assertStatus(200)
            ->assertJsonPath('data.sessions.0.id', $session->public_id)
            ->assertJsonMissingPath('data.sessions.0.public_id');

        $this->assertFalse(is_numeric($response->json('data.sessions.0.id')));
    }

    #[Test]
    public function list_returns_ulid_ids_for_every_item(): void
    {
        $branch = Branch::factory()->create();
        $register = CashRegister::factory()->for($branch)->create();
        $this->actingAsUserWithBranchAccess($branch, 'cash_registers.view');

        $response = $this->getJson('/api/v1/cash-registers');

        $response->assertStatus(200)
            ->assertJsonPath('data.0.id', $register->public_id)
            ->assertJsonMissingPath('data.0.public_id');

        $this->assertFalse(is_numeric($response->json('data.0.id')));
    }

    #[Test]
    public function show_rejects_a_user_without_branch_access(): void
    {
        $branch = Branch::factory()->create();
        $register = CashRegister::factory()->for($branch)->create();
        $this->actingAsUserWithoutBranchAccess('cash_registers.view');

        $response = $this->getJson("/api/v1/cash-registers/{$register->public_id}");

        $response->assertStatus(403);
    }

    #[Test]
    public function show_rejects_a_user_without_the_permission(): void
    {
        $branch = Branch::factory()->create();
        $register = CashRegister::factory()->for($branch)->create();
        $this->actingAsUserWithBranchAccess($branch, 'some.other.permission');

        $response = $this->getJson("/api/v1/cash-registers/{$register->public_id}");

        $response->assertStatus(403);
    }

    #[Test]
    public function show_returns_404_for_a_nonexistent_register(): void
    {
        $branch = Branch::factory()->create();
        $this->actingAsUserWithBranchAccess($branch, 'cash_registers.view');

        $response = $this->getJson('/api/v1/cash-registers/999999');

        $response->assertStatus(404);
    }

    #[Test]
    public function update_actually_updates_the_requested_register(): void
    {
        $branch = Branch::factory()->create();
        $register = CashRegister::factory()->for($branch)->create(['name' => 'Old Name']);
        $this->actingAsUserWithBranchAccess($branch, 'cash_registers.update');

        $response = $this->putJson("/api/v1/cash-registers/{$register->public_id}", [
            'name' => 'New Name',
        ]);

        $response->assertStatus(200)
            ->assertJsonPath('data.name', 'New Name');

        $this->assertDatabaseHas('cash_registers', [
            'id' => $register->id,
            'name' => 'New Name',
        ]);
    }

    #[Test]
    public function update_rejects_a_user_without_branch_access(): void
    {
        $branch = Branch::factory()->create();
        $register = CashRegister::factory()->for($branch)->create(['name' => 'Untouched']);
        $this->actingAsUserWithoutBranchAccess('cash_registers.update');

        $response = $this->putJson("/api/v1/cash-registers/{$register->public_id}", [
            'name' => 'Should Not Apply',
        ]);

        $response->assertStatus(403);
        $this->assertDatabaseHas('cash_registers', ['id' => $register->id, 'name' => 'Untouched']);
    }

    #[Test]
    public function update_returns_404_for_a_nonexistent_register(): void
    {
        $branch = Branch::factory()->create();
        $this->actingAsUserWithBranchAccess($branch, 'cash_registers.update');

        $response = $this->putJson('/api/v1/cash-registers/999999', ['name' => 'X']);

        $response->assertStatus(404);
    }

    #[Test]
    public function delete_actually_deletes_the_requested_register(): void
    {
        $branch = Branch::factory()->create();
        $register = CashRegister::factory()->for($branch)->create();
        $this->actingAsUserWithBranchAccess($branch, 'cash_registers.delete');

        $response = $this->deleteJson("/api/v1/cash-registers/{$register->public_id}");

        $response->assertStatus(200);
        $this->assertDatabaseMissing('cash_registers', ['id' => $register->id]);
    }

    #[Test]
    public function delete_rejects_a_user_without_branch_access(): void
    {
        $branch = Branch::factory()->create();
        $register = CashRegister::factory()->for($branch)->create();
        $this->actingAsUserWithoutBranchAccess('cash_registers.delete');

        $response = $this->deleteJson("/api/v1/cash-registers/{$register->public_id}");

        $response->assertStatus(403);
        $this->assertDatabaseHas('cash_registers', ['id' => $register->id]);
    }
}
