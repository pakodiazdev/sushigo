<?php

namespace Tests\Feature\CashAdjustments\CashSessions;

use App\Models\Branch;
use App\Models\CashRegister;
use App\Models\CashSession;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Passport\Passport;
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

        $response = $this->getJson("/api/v1/cash-sessions/{$session->public_id}");

        $response->assertStatus(200)->assertJsonPath('data.id', $session->public_id);
    }

    #[Test]
    public function show_rejects_a_user_without_branch_access(): void
    {
        $branch = Branch::factory()->create();
        $session = $this->sessionForBranch($branch);
        $this->actingAsUserWithoutBranchAccess('cash_sessions.view');

        $response = $this->getJson("/api/v1/cash-sessions/{$session->public_id}");

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
    public function list_filters_by_cash_register_public_id(): void
    {
        $branch = Branch::factory()->create();
        $register = CashRegister::factory()->for($branch)->create();
        $otherRegister = CashRegister::factory()->for($branch)->create();
        $session = CashSession::factory()->for($register, 'cashRegister')->draft()->create();
        CashSession::factory()->for($otherRegister, 'cashRegister')->draft()->create();
        Passport::actingAs(User::factory()->create());

        $response = $this->getJson('/api/v1/cash-sessions?cash_register_id='.$register->public_id);

        $response->assertStatus(200)
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $session->public_id);
    }

    #[Test]
    public function update_actually_updates_the_requested_session(): void
    {
        $branch = Branch::factory()->create();
        $session = $this->sessionForBranch($branch);
        $this->actingAsUserWithBranchAccess($branch, 'cash_sessions.update');

        $response = $this->putJson("/api/v1/cash-sessions/{$session->public_id}", ['opening_balance' => 500]);

        $response->assertStatus(200);
        $this->assertDatabaseHas('cash_sessions', ['id' => $session->id, 'opening_balance' => 500]);
    }

    #[Test]
    public function update_rejects_a_user_without_branch_access(): void
    {
        $branch = Branch::factory()->create();
        $session = $this->sessionForBranch($branch);
        $this->actingAsUserWithoutBranchAccess('cash_sessions.update');

        $response = $this->putJson("/api/v1/cash-sessions/{$session->public_id}", ['opening_balance' => 500]);

        $response->assertStatus(403);
    }

    #[Test]
    public function post_marks_the_requested_session_as_posted(): void
    {
        $branch = Branch::factory()->create();
        $session = $this->sessionForBranch($branch);
        $this->actingAsUserWithBranchAccess($branch, 'cash_sessions.post');

        $response = $this->postJson("/api/v1/cash-sessions/{$session->public_id}/post");

        $response->assertStatus(200);
        $this->assertDatabaseHas('cash_sessions', ['id' => $session->id, 'status' => CashSession::STATUS_POSTED]);
    }

    #[Test]
    public function post_rejects_a_user_without_branch_access(): void
    {
        $branch = Branch::factory()->create();
        $session = $this->sessionForBranch($branch);
        $this->actingAsUserWithoutBranchAccess('cash_sessions.post');

        $response = $this->postJson("/api/v1/cash-sessions/{$session->public_id}/post");

        $response->assertStatus(403);
        $this->assertDatabaseHas('cash_sessions', ['id' => $session->id, 'status' => CashSession::STATUS_DRAFT]);
    }
}
