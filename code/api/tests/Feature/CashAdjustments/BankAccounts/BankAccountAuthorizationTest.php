<?php

namespace Tests\Feature\CashAdjustments\BankAccounts;

use App\Models\BankAccount;
use App\Models\Branch;
use Illuminate\Foundation\Testing\RefreshDatabase;
use PHPUnit\Framework\Attributes\Test;
use Tests\Feature\CashAdjustments\Concerns\SetsUpBranchAccess;
use Tests\TestCase;

/**
 * Regression coverage for #291: Show/Update/Delete previously operated on a
 * blank model with no resource-level authorization at all.
 */
class BankAccountAuthorizationTest extends TestCase
{
    use RefreshDatabase;
    use SetsUpBranchAccess;

    #[Test]
    public function show_returns_the_actual_requested_account(): void
    {
        $branch = Branch::factory()->create();
        $account = BankAccount::factory()->for($branch)->create(['alias' => 'Cuenta Real']);
        $this->actingAsUserWithBranchAccess($branch, 'bank_accounts.view');

        $response = $this->getJson("/api/v1/bank-accounts/{$account->public_id}");

        $response->assertStatus(200)->assertJsonPath('data.id', $account->public_id);
    }

    #[Test]
    public function list_rejects_a_user_without_the_permission(): void
    {
        $branch = Branch::factory()->create();
        BankAccount::factory()->for($branch)->create();
        $this->actingAsUserWithBranchAccess($branch, 'some.other.permission');

        $response = $this->getJson('/api/v1/bank-accounts');

        $response->assertStatus(403);
    }

    #[Test]
    public function list_only_returns_accounts_within_the_users_branch(): void
    {
        $branchA = Branch::factory()->create();
        $branchB = Branch::factory()->create();
        $accountA = BankAccount::factory()->for($branchA)->create();
        BankAccount::factory()->for($branchB)->create();
        $this->actingAsUserWithBranchAccess($branchA, 'bank_accounts.view');

        $response = $this->getJson('/api/v1/bank-accounts');

        $response->assertStatus(200)
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $accountA->public_id);
    }

    #[Test]
    public function show_rejects_a_user_without_branch_access(): void
    {
        $branch = Branch::factory()->create();
        $account = BankAccount::factory()->for($branch)->create();
        $this->actingAsUserWithoutBranchAccess('bank_accounts.view');

        $response = $this->getJson("/api/v1/bank-accounts/{$account->public_id}");

        $response->assertStatus(403);
    }

    #[Test]
    public function show_returns_404_for_a_nonexistent_account(): void
    {
        $branch = Branch::factory()->create();
        $this->actingAsUserWithBranchAccess($branch, 'bank_accounts.view');

        $response = $this->getJson('/api/v1/bank-accounts/999999');

        $response->assertStatus(404);
    }

    #[Test]
    public function update_actually_updates_the_requested_account(): void
    {
        $branch = Branch::factory()->create();
        $account = BankAccount::factory()->for($branch)->create(['alias' => 'Old Alias']);
        $this->actingAsUserWithBranchAccess($branch, 'bank_accounts.update');

        $response = $this->putJson("/api/v1/bank-accounts/{$account->public_id}", ['alias' => 'New Alias']);

        $response->assertStatus(200)->assertJsonPath('data.alias', 'New Alias');
        $this->assertDatabaseHas('bank_accounts', ['id' => $account->id, 'alias' => 'New Alias']);
    }

    #[Test]
    public function update_rejects_a_user_without_branch_access(): void
    {
        $branch = Branch::factory()->create();
        $account = BankAccount::factory()->for($branch)->create(['alias' => 'Untouched']);
        $this->actingAsUserWithoutBranchAccess('bank_accounts.update');

        $response = $this->putJson("/api/v1/bank-accounts/{$account->public_id}", ['alias' => 'Nope']);

        $response->assertStatus(403);
        $this->assertDatabaseHas('bank_accounts', ['id' => $account->id, 'alias' => 'Untouched']);
    }

    #[Test]
    public function delete_actually_deletes_the_requested_account(): void
    {
        $branch = Branch::factory()->create();
        $account = BankAccount::factory()->for($branch)->create();
        $this->actingAsUserWithBranchAccess($branch, 'bank_accounts.delete');

        $response = $this->deleteJson("/api/v1/bank-accounts/{$account->public_id}");

        $response->assertStatus(200);
        $this->assertDatabaseMissing('bank_accounts', ['id' => $account->id]);
    }

    #[Test]
    public function delete_rejects_a_user_without_branch_access(): void
    {
        $branch = Branch::factory()->create();
        $account = BankAccount::factory()->for($branch)->create();
        $this->actingAsUserWithoutBranchAccess('bank_accounts.delete');

        $response = $this->deleteJson("/api/v1/bank-accounts/{$account->public_id}");

        $response->assertStatus(403);
        $this->assertDatabaseHas('bank_accounts', ['id' => $account->id]);
    }
}
