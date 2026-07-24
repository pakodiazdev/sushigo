<?php

namespace Tests\Feature\CashAdjustments\CashSessions;

use App\Models\Branch;
use App\Models\CashRegister;
use App\Models\CashSession;
use Illuminate\Foundation\Testing\RefreshDatabase;
use PHPUnit\Framework\Attributes\Test;
use Tests\Feature\CashAdjustments\Concerns\SetsUpBranchAccess;
use Tests\TestCase;

/**
 * Regression coverage for #291: Show/Update/Post previously operated on a
 * blank model (branch access derived from cashSession->cashRegister->branch_id
 * of an empty model) with no resource-level authorization at all.
 */
class CashSessionAuthorizationTest extends TestCase
{
    use RefreshDatabase;
    use SetsUpBranchAccess;

    private function sessionForBranch(Branch $branch): CashSession
    {
        $register = CashRegister::factory()->for($branch)->create();

        return CashSession::factory()->for($register, 'cashRegister')->draft()->create();
    }

    #[Test]
    public function show_returns_the_actual_requested_session(): void
    {
        $branch = Branch::factory()->create();
        $session = $this->sessionForBranch($branch);
        $this->actingAsUserWithBranchAccess($branch, 'cash_sessions.view');

        $response = $this->getJson("/api/v1/cash-sessions/{$session->id}");

        $response->assertStatus(200)->assertJsonPath('data.id', $session->id);
    }

    #[Test]
    public function show_rejects_a_user_without_branch_access(): void
    {
        $branch = Branch::factory()->create();
        $session = $this->sessionForBranch($branch);
        $this->actingAsUserWithoutBranchAccess('cash_sessions.view');

        $response = $this->getJson("/api/v1/cash-sessions/{$session->id}");

        $response->assertStatus(403);
    }

    #[Test]
    public function show_returns_404_for_a_nonexistent_session(): void
    {
        $branch = Branch::factory()->create();
        $this->actingAsUserWithBranchAccess($branch, 'cash_sessions.view');

        $response = $this->getJson('/api/v1/cash-sessions/999999');

        $response->assertStatus(404);
    }

    #[Test]
    public function update_actually_updates_the_requested_session(): void
    {
        $branch = Branch::factory()->create();
        $session = $this->sessionForBranch($branch);
        $this->actingAsUserWithBranchAccess($branch, 'cash_sessions.update');

        $response = $this->putJson("/api/v1/cash-sessions/{$session->id}", ['opening_balance' => 500]);

        $response->assertStatus(200);
        $this->assertDatabaseHas('cash_sessions', ['id' => $session->id, 'opening_balance' => 500]);
    }

    #[Test]
    public function update_rejects_a_user_without_branch_access(): void
    {
        $branch = Branch::factory()->create();
        $session = $this->sessionForBranch($branch);
        $this->actingAsUserWithoutBranchAccess('cash_sessions.update');

        $response = $this->putJson("/api/v1/cash-sessions/{$session->id}", ['opening_balance' => 500]);

        $response->assertStatus(403);
    }

    #[Test]
    public function post_marks_the_requested_session_as_posted(): void
    {
        $branch = Branch::factory()->create();
        $session = $this->sessionForBranch($branch);
        $this->actingAsUserWithBranchAccess($branch, 'cash_sessions.post');

        $response = $this->postJson("/api/v1/cash-sessions/{$session->id}/post");

        $response->assertStatus(200);
        $this->assertDatabaseHas('cash_sessions', ['id' => $session->id, 'status' => CashSession::STATUS_POSTED]);
    }

    #[Test]
    public function post_rejects_a_user_without_branch_access(): void
    {
        $branch = Branch::factory()->create();
        $session = $this->sessionForBranch($branch);
        $this->actingAsUserWithoutBranchAccess('cash_sessions.post');

        $response = $this->postJson("/api/v1/cash-sessions/{$session->id}/post");

        $response->assertStatus(403);
        $this->assertDatabaseHas('cash_sessions', ['id' => $session->id, 'status' => CashSession::STATUS_DRAFT]);
    }
}
