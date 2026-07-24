<?php

namespace Tests\Feature\CashAdjustments\CashTerminals;

use App\Models\Branch;
use App\Models\CashTerminal;
use Illuminate\Foundation\Testing\RefreshDatabase;
use PHPUnit\Framework\Attributes\Test;
use Tests\Feature\CashAdjustments\Concerns\SetsUpBranchAccess;
use Tests\TestCase;

/**
 * Regression coverage for #291: Show/Update/Delete previously operated on a
 * blank model with no resource-level authorization at all.
 */
class CashTerminalAuthorizationTest extends TestCase
{
    use RefreshDatabase;
    use SetsUpBranchAccess;

    #[Test]
    public function show_returns_the_actual_requested_terminal(): void
    {
        $branch = Branch::factory()->create();
        $terminal = CashTerminal::factory()->for($branch)->create(['name' => 'Terminal Real']);
        $this->actingAsUserWithBranchAccess($branch, 'cash_terminals.view');

        $response = $this->getJson("/api/v1/cash-terminals/{$terminal->id}");

        $response->assertStatus(200)->assertJsonPath('data.id', $terminal->id);
    }

    #[Test]
    public function show_rejects_a_user_without_branch_access(): void
    {
        $branch = Branch::factory()->create();
        $terminal = CashTerminal::factory()->for($branch)->create();
        $this->actingAsUserWithoutBranchAccess('cash_terminals.view');

        $response = $this->getJson("/api/v1/cash-terminals/{$terminal->id}");

        $response->assertStatus(403);
    }

    #[Test]
    public function show_returns_404_for_a_nonexistent_terminal(): void
    {
        $branch = Branch::factory()->create();
        $this->actingAsUserWithBranchAccess($branch, 'cash_terminals.view');

        $response = $this->getJson('/api/v1/cash-terminals/999999');

        $response->assertStatus(404);
    }

    #[Test]
    public function update_actually_updates_the_requested_terminal(): void
    {
        $branch = Branch::factory()->create();
        $terminal = CashTerminal::factory()->for($branch)->create(['name' => 'Old Name']);
        $this->actingAsUserWithBranchAccess($branch, 'cash_terminals.update');

        $response = $this->putJson("/api/v1/cash-terminals/{$terminal->id}", ['name' => 'New Name']);

        $response->assertStatus(200)->assertJsonPath('data.name', 'New Name');
        $this->assertDatabaseHas('cash_terminals', ['id' => $terminal->id, 'name' => 'New Name']);
    }

    #[Test]
    public function update_rejects_a_user_without_branch_access(): void
    {
        $branch = Branch::factory()->create();
        $terminal = CashTerminal::factory()->for($branch)->create(['name' => 'Untouched']);
        $this->actingAsUserWithoutBranchAccess('cash_terminals.update');

        $response = $this->putJson("/api/v1/cash-terminals/{$terminal->id}", ['name' => 'Nope']);

        $response->assertStatus(403);
        $this->assertDatabaseHas('cash_terminals', ['id' => $terminal->id, 'name' => 'Untouched']);
    }

    #[Test]
    public function delete_actually_deletes_the_requested_terminal(): void
    {
        $branch = Branch::factory()->create();
        $terminal = CashTerminal::factory()->for($branch)->create();
        $this->actingAsUserWithBranchAccess($branch, 'cash_terminals.delete');

        $response = $this->deleteJson("/api/v1/cash-terminals/{$terminal->id}");

        $response->assertStatus(200);
        $this->assertDatabaseMissing('cash_terminals', ['id' => $terminal->id]);
    }

    #[Test]
    public function delete_rejects_a_user_without_branch_access(): void
    {
        $branch = Branch::factory()->create();
        $terminal = CashTerminal::factory()->for($branch)->create();
        $this->actingAsUserWithoutBranchAccess('cash_terminals.delete');

        $response = $this->deleteJson("/api/v1/cash-terminals/{$terminal->id}");

        $response->assertStatus(403);
        $this->assertDatabaseHas('cash_terminals', ['id' => $terminal->id]);
    }
}
