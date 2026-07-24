<?php

namespace Tests\Feature\CashAdjustments\CashExpenses;

use App\Models\Branch;
use App\Models\CashExpense;
use App\Models\CashRegister;
use App\Models\CashSession;
use App\Models\CashTerminal;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Passport\Passport;
use PHPUnit\Framework\Attributes\Test;
use Tests\Feature\CashAdjustments\Concerns\SetsUpBranchAccess;
use Tests\TestCase;

/**
 * Regression coverage for #291: Show/Update/Delete/Post previously operated
 * on a blank model with no resource-level authorization at all.
 */
class CashExpenseAuthorizationTest extends TestCase
{
    use RefreshDatabase;
    use SetsUpBranchAccess;

    private function expenseForBranch(Branch $branch): CashExpense
    {
        $register = CashRegister::factory()->for($branch)->create();
        $session = CashSession::factory()->for($register, 'cashRegister')->draft()->create();

        return CashExpense::factory()->for($session, 'cashSession')->cash()->draft()->create();
    }

    #[Test]
    public function show_returns_the_actual_requested_expense(): void
    {
        $branch = Branch::factory()->create();
        $expense = $this->expenseForBranch($branch);
        $this->actingAsUserWithBranchAccess($branch, 'cash_expenses.view');

        $response = $this->getJson("/api/v1/cash-expenses/{$expense->public_id}");

        $response->assertStatus(200)->assertJsonPath('data.id', $expense->public_id);
    }

    #[Test]
    public function show_rejects_a_user_without_branch_access(): void
    {
        $branch = Branch::factory()->create();
        $expense = $this->expenseForBranch($branch);
        $this->actingAsUserWithoutBranchAccess('cash_expenses.view');

        $response = $this->getJson("/api/v1/cash-expenses/{$expense->public_id}");

        $response->assertStatus(403);
    }

    #[Test]
    public function show_returns_404_for_a_nonexistent_expense(): void
    {
        $branch = Branch::factory()->create();
        $this->actingAsUserWithBranchAccess($branch, 'cash_expenses.view');

        $response = $this->getJson('/api/v1/cash-expenses/999999');

        $response->assertStatus(404);
    }

    #[Test]
    public function list_filters_by_cash_session_public_id(): void
    {
        $branch = Branch::factory()->create();
        $expense = $this->expenseForBranch($branch);
        CashExpense::factory()->for(
            CashSession::factory()->for(CashRegister::factory()->for($branch)->create(), 'cashRegister')->draft(),
            'cashSession'
        )->cash()->draft()->create();
        Passport::actingAs(User::factory()->create());

        $response = $this->getJson('/api/v1/cash-expenses?cash_session_id='.$expense->cashSession->public_id);

        $response->assertStatus(200)
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $expense->public_id);
    }

    #[Test]
    public function update_actually_updates_the_requested_expense(): void
    {
        $branch = Branch::factory()->create();
        $expense = $this->expenseForBranch($branch);
        $this->actingAsUserWithBranchAccess($branch, 'cash_expenses.update');

        $response = $this->putJson("/api/v1/cash-expenses/{$expense->public_id}", ['category' => 'UTILITIES']);

        $response->assertStatus(200);
        $this->assertDatabaseHas('cash_expenses', ['id' => $expense->id, 'category' => 'UTILITIES']);
    }

    #[Test]
    public function update_resolves_card_terminal_public_id_to_the_numeric_fk(): void
    {
        $branch = Branch::factory()->create();
        $expense = $this->expenseForBranch($branch);
        $terminal = CashTerminal::factory()->for($branch)->create();
        $this->actingAsUserWithBranchAccess($branch, 'cash_expenses.update');

        $response = $this->putJson("/api/v1/cash-expenses/{$expense->public_id}", [
            'tender_type' => 'CARD',
            'card_terminal_id' => $terminal->public_id,
        ]);

        $response->assertStatus(200);
        $this->assertDatabaseHas('cash_expenses', [
            'id' => $expense->id,
            'tender_type' => 'CARD',
            'card_terminal_id' => $terminal->id,
        ]);
    }

    #[Test]
    public function update_rejects_a_user_without_branch_access(): void
    {
        $branch = Branch::factory()->create();
        $expense = $this->expenseForBranch($branch);
        $this->actingAsUserWithoutBranchAccess('cash_expenses.update');

        $response = $this->putJson("/api/v1/cash-expenses/{$expense->public_id}", ['category' => 'UTILITIES']);

        $response->assertStatus(403);
    }

    #[Test]
    public function delete_actually_deletes_the_requested_expense(): void
    {
        $branch = Branch::factory()->create();
        $expense = $this->expenseForBranch($branch);
        $this->actingAsUserWithBranchAccess($branch, 'cash_expenses.delete');

        $response = $this->deleteJson("/api/v1/cash-expenses/{$expense->public_id}");

        $response->assertStatus(200);
        $this->assertDatabaseMissing('cash_expenses', ['id' => $expense->id]);
    }

    #[Test]
    public function delete_rejects_a_user_without_branch_access(): void
    {
        $branch = Branch::factory()->create();
        $expense = $this->expenseForBranch($branch);
        $this->actingAsUserWithoutBranchAccess('cash_expenses.delete');

        $response = $this->deleteJson("/api/v1/cash-expenses/{$expense->public_id}");

        $response->assertStatus(403);
        $this->assertDatabaseHas('cash_expenses', ['id' => $expense->id]);
    }

    #[Test]
    public function post_marks_the_requested_expense_as_posted(): void
    {
        $branch = Branch::factory()->create();
        $expense = $this->expenseForBranch($branch);
        $this->actingAsUserWithBranchAccess($branch, 'cash_expenses.post');

        $response = $this->postJson("/api/v1/cash-expenses/{$expense->public_id}/post");

        $response->assertStatus(200);
        $this->assertDatabaseHas('cash_expenses', ['id' => $expense->id]);
        $this->assertNotNull($expense->fresh()->posted_at);
    }

    #[Test]
    public function post_rejects_a_user_without_branch_access(): void
    {
        $branch = Branch::factory()->create();
        $expense = $this->expenseForBranch($branch);
        $this->actingAsUserWithoutBranchAccess('cash_expenses.post');

        $response = $this->postJson("/api/v1/cash-expenses/{$expense->public_id}/post");

        $response->assertStatus(403);
        $this->assertNull($expense->fresh()->posted_at);
    }
}
