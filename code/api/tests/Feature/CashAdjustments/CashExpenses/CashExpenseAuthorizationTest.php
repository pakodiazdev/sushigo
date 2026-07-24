<?php

namespace Tests\Feature\CashAdjustments\CashExpenses;

use App\Models\Branch;
use App\Models\CashExpense;
use App\Models\CashRegister;
use App\Models\CashSession;
use Illuminate\Foundation\Testing\RefreshDatabase;
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

        $response = $this->getJson("/api/v1/cash-expenses/{$expense->id}");

        $response->assertStatus(200)->assertJsonPath('data.id', $expense->id);
    }

    #[Test]
    public function show_rejects_a_user_without_branch_access(): void
    {
        $branch = Branch::factory()->create();
        $expense = $this->expenseForBranch($branch);
        $this->actingAsUserWithoutBranchAccess('cash_expenses.view');

        $response = $this->getJson("/api/v1/cash-expenses/{$expense->id}");

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
    public function update_actually_updates_the_requested_expense(): void
    {
        $branch = Branch::factory()->create();
        $expense = $this->expenseForBranch($branch);
        $this->actingAsUserWithBranchAccess($branch, 'cash_expenses.update');

        $response = $this->putJson("/api/v1/cash-expenses/{$expense->id}", ['category' => 'UTILITIES']);

        $response->assertStatus(200);
        $this->assertDatabaseHas('cash_expenses', ['id' => $expense->id, 'category' => 'UTILITIES']);
    }

    #[Test]
    public function update_rejects_a_user_without_branch_access(): void
    {
        $branch = Branch::factory()->create();
        $expense = $this->expenseForBranch($branch);
        $this->actingAsUserWithoutBranchAccess('cash_expenses.update');

        $response = $this->putJson("/api/v1/cash-expenses/{$expense->id}", ['category' => 'UTILITIES']);

        $response->assertStatus(403);
    }

    #[Test]
    public function delete_actually_deletes_the_requested_expense(): void
    {
        $branch = Branch::factory()->create();
        $expense = $this->expenseForBranch($branch);
        $this->actingAsUserWithBranchAccess($branch, 'cash_expenses.delete');

        $response = $this->deleteJson("/api/v1/cash-expenses/{$expense->id}");

        $response->assertStatus(200);
        $this->assertDatabaseMissing('cash_expenses', ['id' => $expense->id]);
    }

    #[Test]
    public function delete_rejects_a_user_without_branch_access(): void
    {
        $branch = Branch::factory()->create();
        $expense = $this->expenseForBranch($branch);
        $this->actingAsUserWithoutBranchAccess('cash_expenses.delete');

        $response = $this->deleteJson("/api/v1/cash-expenses/{$expense->id}");

        $response->assertStatus(403);
        $this->assertDatabaseHas('cash_expenses', ['id' => $expense->id]);
    }

    #[Test]
    public function post_marks_the_requested_expense_as_posted(): void
    {
        $branch = Branch::factory()->create();
        $expense = $this->expenseForBranch($branch);
        $this->actingAsUserWithBranchAccess($branch, 'cash_expenses.post');

        $response = $this->postJson("/api/v1/cash-expenses/{$expense->id}/post");

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

        $response = $this->postJson("/api/v1/cash-expenses/{$expense->id}/post");

        $response->assertStatus(403);
        $this->assertNull($expense->fresh()->posted_at);
    }
}
