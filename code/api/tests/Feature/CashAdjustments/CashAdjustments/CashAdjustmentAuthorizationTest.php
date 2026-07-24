<?php

namespace Tests\Feature\CashAdjustments\CashAdjustments;

use App\Models\Branch;
use App\Models\CashAdjustment;
use App\Models\CashAdjustmentLine;
use App\Models\CashRegister;
use App\Models\CashSession;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Passport\Passport;
use PHPUnit\Framework\Attributes\Test;
use Tests\Feature\CashAdjustments\Concerns\SetsUpBranchAccess;
use Tests\TestCase;

/**
 * Regression coverage for #291: Show/Delete/Post previously operated on a
 * blank model with no resource-level authorization at all.
 */
class CashAdjustmentAuthorizationTest extends TestCase
{
    use RefreshDatabase;
    use SetsUpBranchAccess;

    private function adjustmentForBranch(Branch $branch): CashAdjustment
    {
        $register = CashRegister::factory()->for($branch)->create();
        $session = CashSession::factory()->for($register, 'cashRegister')->draft()->create();

        return CashAdjustment::factory()->for($session, 'cashSession')->draft()->create();
    }

    #[Test]
    public function show_does_not_leak_the_numeric_adjustment_fk_on_nested_lines(): void
    {
        $branch = Branch::factory()->create();
        $adjustment = $this->adjustmentForBranch($branch);
        CashAdjustmentLine::factory()->for($adjustment, 'cashAdjustment')->cash()->create();
        $this->actingAsUserWithBranchAccess($branch, 'cash_adjustments.view');

        $response = $this->getJson("/api/v1/cash-adjustments/{$adjustment->public_id}");

        $response->assertStatus(200)
            ->assertJsonMissingPath('data.lines.0.cash_adjustment_id');
    }

    #[Test]
    public function show_returns_the_actual_requested_adjustment(): void
    {
        $branch = Branch::factory()->create();
        $adjustment = $this->adjustmentForBranch($branch);
        $this->actingAsUserWithBranchAccess($branch, 'cash_adjustments.view');

        $response = $this->getJson("/api/v1/cash-adjustments/{$adjustment->public_id}");

        $response->assertStatus(200)->assertJsonPath('data.id', $adjustment->public_id);
    }

    #[Test]
    public function show_rejects_a_user_without_branch_access(): void
    {
        $branch = Branch::factory()->create();
        $adjustment = $this->adjustmentForBranch($branch);
        $this->actingAsUserWithoutBranchAccess('cash_adjustments.view');

        $response = $this->getJson("/api/v1/cash-adjustments/{$adjustment->public_id}");

        $response->assertStatus(403);
    }

    #[Test]
    public function show_returns_404_for_a_nonexistent_adjustment(): void
    {
        $branch = Branch::factory()->create();
        $this->actingAsUserWithBranchAccess($branch, 'cash_adjustments.view');

        $response = $this->getJson('/api/v1/cash-adjustments/999999');

        $response->assertStatus(404);
    }

    #[Test]
    public function list_filters_by_cash_session_public_id(): void
    {
        $branch = Branch::factory()->create();
        $adjustment = $this->adjustmentForBranch($branch);
        CashAdjustment::factory()->for(
            CashSession::factory()->for(CashRegister::factory()->for($branch)->create(), 'cashRegister')->draft(),
            'cashSession'
        )->draft()->create();
        Passport::actingAs(User::factory()->create());

        $response = $this->getJson('/api/v1/cash-adjustments?cash_session_id='.$adjustment->cashSession->public_id);

        $response->assertStatus(200)
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $adjustment->public_id);
    }

    #[Test]
    public function delete_actually_deletes_the_requested_adjustment(): void
    {
        $branch = Branch::factory()->create();
        $adjustment = $this->adjustmentForBranch($branch);
        $this->actingAsUserWithBranchAccess($branch, 'cash_adjustments.delete');

        $response = $this->deleteJson("/api/v1/cash-adjustments/{$adjustment->public_id}");

        $response->assertStatus(200);
        $this->assertDatabaseMissing('cash_adjustments', ['id' => $adjustment->id]);
    }

    #[Test]
    public function delete_rejects_a_user_without_branch_access(): void
    {
        $branch = Branch::factory()->create();
        $adjustment = $this->adjustmentForBranch($branch);
        $this->actingAsUserWithoutBranchAccess('cash_adjustments.delete');

        $response = $this->deleteJson("/api/v1/cash-adjustments/{$adjustment->public_id}");

        $response->assertStatus(403);
        $this->assertDatabaseHas('cash_adjustments', ['id' => $adjustment->id]);
    }

    #[Test]
    public function post_marks_the_requested_adjustment_as_posted(): void
    {
        $branch = Branch::factory()->create();
        $adjustment = $this->adjustmentForBranch($branch);
        $this->actingAsUserWithBranchAccess($branch, 'cash_adjustments.post');

        $response = $this->postJson("/api/v1/cash-adjustments/{$adjustment->public_id}/post");

        $response->assertStatus(200);
        $this->assertNotNull($adjustment->fresh()->posted_at);
    }

    #[Test]
    public function post_rejects_a_user_without_branch_access(): void
    {
        $branch = Branch::factory()->create();
        $adjustment = $this->adjustmentForBranch($branch);
        $this->actingAsUserWithoutBranchAccess('cash_adjustments.post');

        $response = $this->postJson("/api/v1/cash-adjustments/{$adjustment->public_id}/post");

        $response->assertStatus(403);
        $this->assertNull($adjustment->fresh()->posted_at);
    }
}
