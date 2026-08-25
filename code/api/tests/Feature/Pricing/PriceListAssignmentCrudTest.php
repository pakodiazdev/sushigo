<?php

namespace Tests\Feature\Pricing;

use PHPUnit\Framework\Attributes\Test;

class PriceListAssignmentCrudTest extends PricingTestCase
{
    #[Test]
    public function it_rejects_unauthenticated_requests()
    {
        $response = $this->getJson('/api/v1/pricing/price-list-assignments');

        $response->assertStatus(401);
    }

    #[Test]
    public function it_creates_an_assignment_when_the_user_has_branch_access()
    {
        $branch = $this->createBranch();
        $this->actingAsUserWithBranchAccess($branch, ['price_list_assignments.create']);
        $priceList = $this->createPriceList();

        $response = $this->postJson('/api/v1/pricing/price-list-assignments', [
            'price_list_id' => $priceList->public_id,
            'branch_id' => $branch->id,
            'effective_from' => '2026-01-01',
        ]);

        $response->assertStatus(201)
            ->assertJsonPath('data.branch_id', $branch->id)
            ->assertJsonPath('data.operating_unit_id', null);

        $this->assertDatabaseHas('price_list_assignments', [
            'price_list_id' => $priceList->id,
            'branch_id' => $branch->id,
        ]);
    }

    #[Test]
    public function it_rejects_creating_an_assignment_for_a_branch_the_user_has_no_access_to()
    {
        $branch = $this->createBranch();
        $this->actingAsUserWithoutBranchAccess(['price_list_assignments.create']);
        $priceList = $this->createPriceList();

        $response = $this->postJson('/api/v1/pricing/price-list-assignments', [
            'price_list_id' => $priceList->public_id,
            'branch_id' => $branch->id,
            'effective_from' => '2026-01-01',
        ]);

        $response->assertStatus(403);
    }

    #[Test]
    public function it_rejects_an_operating_unit_that_does_not_belong_to_the_given_branch()
    {
        $branch = $this->createBranch();
        $otherBranch = $this->createBranch();
        $this->actingAsUserWithBranchAccess($branch, ['price_list_assignments.create']);
        $priceList = $this->createPriceList();
        $foreignOu = $this->createOperatingUnit($otherBranch);

        $response = $this->postJson('/api/v1/pricing/price-list-assignments', [
            'price_list_id' => $priceList->public_id,
            'branch_id' => $branch->id,
            'operating_unit_id' => $foreignOu->id,
            'effective_from' => '2026-01-01',
        ]);

        $response->assertStatus(422)->assertJsonValidationErrors(['operating_unit_id']);
    }

    #[Test]
    public function it_rejects_a_second_active_assignment_with_the_same_priority_and_an_overlapping_window()
    {
        $branch = $this->createBranch();
        $this->actingAsUserWithBranchAccess($branch, ['price_list_assignments.create']);
        $listA = $this->createPriceList(['priority' => 5]);
        $listB = $this->createPriceList(['priority' => 5]);
        $this->createAssignment($listA, $branch, null, ['effective_from' => '2026-01-01', 'effective_to' => '2026-06-30']);

        $response = $this->postJson('/api/v1/pricing/price-list-assignments', [
            'price_list_id' => $listB->public_id,
            'branch_id' => $branch->id,
            'effective_from' => '2026-03-01',
            'effective_to' => '2026-12-31',
        ]);

        $response->assertStatus(422)->assertJsonValidationErrors(['price_list_id']);
    }

    #[Test]
    public function it_allows_a_second_active_assignment_with_a_different_priority_and_an_overlapping_window()
    {
        $branch = $this->createBranch();
        $this->actingAsUserWithBranchAccess($branch, ['price_list_assignments.create']);
        $listA = $this->createPriceList(['priority' => 5]);
        $listB = $this->createPriceList(['priority' => 10]);
        $this->createAssignment($listA, $branch, null, ['effective_from' => '2026-01-01', 'effective_to' => '2026-06-30']);

        $response = $this->postJson('/api/v1/pricing/price-list-assignments', [
            'price_list_id' => $listB->public_id,
            'branch_id' => $branch->id,
            'effective_from' => '2026-03-01',
            'effective_to' => '2026-12-31',
        ]);

        $response->assertStatus(201);
    }

    #[Test]
    public function it_allows_the_same_priority_when_windows_do_not_overlap()
    {
        $branch = $this->createBranch();
        $this->actingAsUserWithBranchAccess($branch, ['price_list_assignments.create']);
        $listA = $this->createPriceList(['priority' => 5]);
        $listB = $this->createPriceList(['priority' => 5]);
        $this->createAssignment($listA, $branch, null, ['effective_from' => '2026-01-01', 'effective_to' => '2026-06-30']);

        $response = $this->postJson('/api/v1/pricing/price-list-assignments', [
            'price_list_id' => $listB->public_id,
            'branch_id' => $branch->id,
            'effective_from' => '2026-07-01',
        ]);

        $response->assertStatus(201);
    }

    #[Test]
    public function it_allows_an_inactive_assignment_to_overlap_an_active_one_with_the_same_priority()
    {
        $branch = $this->createBranch();
        $this->actingAsUserWithBranchAccess($branch, ['price_list_assignments.create']);
        $listA = $this->createPriceList(['priority' => 5]);
        $listB = $this->createPriceList(['priority' => 5]);
        $this->createAssignment($listA, $branch, null, ['effective_from' => '2026-01-01', 'effective_to' => '2026-06-30']);

        $response = $this->postJson('/api/v1/pricing/price-list-assignments', [
            'price_list_id' => $listB->public_id,
            'branch_id' => $branch->id,
            'effective_from' => '2026-03-01',
            'is_active' => false,
        ]);

        $response->assertStatus(201);
    }

    #[Test]
    public function it_allows_updating_an_assignment_to_inactive_even_if_it_would_otherwise_tie()
    {
        $branch = $this->createBranch();
        $this->actingAsUserWithBranchAccess($branch, ['price_list_assignments.create', 'price_list_assignments.update']);
        $listA = $this->createPriceList(['priority' => 5]);
        $listB = $this->createPriceList(['priority' => 5]);
        $this->createAssignment($listA, $branch, null, ['effective_from' => '2026-01-01', 'effective_to' => '2026-06-30']);
        $assignmentB = $this->createAssignment($listB, $branch, null, ['effective_from' => '2026-07-01', 'effective_to' => null]);

        $response = $this->putJson("/api/v1/pricing/price-list-assignments/{$assignmentB->public_id}", [
            'effective_from' => '2026-01-01',
            'is_active' => false,
        ]);

        $response->assertStatus(200)->assertJsonPath('data.is_active', false);
    }

    #[Test]
    public function it_shows_and_updates_an_assignment_only_with_branch_access()
    {
        $branch = $this->createBranch();
        $priceList = $this->createPriceList();
        $assignment = $this->createAssignment($priceList, $branch);

        $this->actingAsUserWithoutBranchAccess(['price_list_assignments.view', 'price_list_assignments.update']);

        $this->getJson("/api/v1/pricing/price-list-assignments/{$assignment->public_id}")->assertStatus(403);
        $this->putJson("/api/v1/pricing/price-list-assignments/{$assignment->public_id}", ['is_active' => false])->assertStatus(403);

        $this->actingAsUserWithBranchAccess($branch, ['price_list_assignments.view', 'price_list_assignments.update']);

        $this->getJson("/api/v1/pricing/price-list-assignments/{$assignment->public_id}")->assertStatus(200);
        $this->putJson("/api/v1/pricing/price-list-assignments/{$assignment->public_id}", ['is_active' => false])
            ->assertStatus(200)
            ->assertJsonPath('data.is_active', false);
    }

    #[Test]
    public function it_ignores_a_lingering_assignment_of_a_soft_deleted_price_list_when_checking_for_ties()
    {
        $branch = $this->createBranch();
        $this->actingAsUserWithBranchAccess($branch, ['price_list_assignments.create']);
        $listA = $this->createPriceList(['priority' => 5]);
        $this->createAssignment($listA, $branch, null, ['effective_from' => '2026-01-01', 'effective_to' => '2026-06-30']);
        $listA->delete();

        $listB = $this->createPriceList(['priority' => 5]);

        $response = $this->postJson('/api/v1/pricing/price-list-assignments', [
            'price_list_id' => $listB->public_id,
            'branch_id' => $branch->id,
            'effective_from' => '2026-03-01',
            'effective_to' => '2026-12-31',
        ]);

        $response->assertStatus(201);
    }

    #[Test]
    public function it_rejects_a_soft_deleted_price_list_reference_instead_of_crashing()
    {
        $branch = $this->createBranch();
        $this->actingAsUserWithBranchAccess($branch, ['price_list_assignments.create']);
        $priceList = $this->createPriceList();
        $priceList->delete();

        $response = $this->postJson('/api/v1/pricing/price-list-assignments', [
            'price_list_id' => $priceList->public_id,
            'branch_id' => $branch->id,
            'effective_from' => '2026-01-01',
        ]);

        $response->assertStatus(422)->assertJsonValidationErrors(['price_list_id']);
    }

    #[Test]
    public function it_rejects_updating_an_assignment_whose_own_price_list_was_soft_deleted()
    {
        $branch = $this->createBranch();
        $this->actingAsUserWithBranchAccess($branch, ['price_list_assignments.update']);
        $priceList = $this->createPriceList();
        $assignment = $this->createAssignment($priceList, $branch, null, ['effective_from' => '2026-01-01', 'effective_to' => '2026-06-30']);
        $priceList->delete();

        $response = $this->putJson("/api/v1/pricing/price-list-assignments/{$assignment->public_id}", [
            'effective_to' => '2026-12-31',
        ]);

        $response->assertStatus(422)->assertJsonValidationErrors(['price_list_id']);
    }

    #[Test]
    public function it_rejects_a_partial_update_with_a_non_iso_date_that_would_still_invert_the_range()
    {
        $branch = $this->createBranch();
        $this->actingAsUserWithBranchAccess($branch, ['price_list_assignments.update']);
        $priceList = $this->createPriceList();
        $assignment = $this->createAssignment($priceList, $branch, null, ['effective_from' => '2026-01-01', 'effective_to' => '2026-06-30']);

        $response = $this->putJson("/api/v1/pricing/price-list-assignments/{$assignment->public_id}", [
            'effective_from' => '08/01/2026',
        ]);

        $response->assertStatus(422)->assertJsonValidationErrors(['effective_to']);
    }

    #[Test]
    public function it_rejects_a_partial_update_that_would_put_effective_from_after_the_stored_effective_to()
    {
        $branch = $this->createBranch();
        $this->actingAsUserWithBranchAccess($branch, ['price_list_assignments.update']);
        $priceList = $this->createPriceList();
        $assignment = $this->createAssignment($priceList, $branch, null, ['effective_from' => '2026-01-01', 'effective_to' => '2026-06-30']);

        $response = $this->putJson("/api/v1/pricing/price-list-assignments/{$assignment->public_id}", [
            'effective_from' => '2026-08-01',
        ]);

        $response->assertStatus(422)->assertJsonValidationErrors(['effective_to']);
    }

    #[Test]
    public function it_deletes_an_assignment_with_branch_access()
    {
        $branch = $this->createBranch();
        $priceList = $this->createPriceList();
        $assignment = $this->createAssignment($priceList, $branch);

        $this->actingAsUserWithBranchAccess($branch, ['price_list_assignments.delete']);

        $response = $this->deleteJson("/api/v1/pricing/price-list-assignments/{$assignment->public_id}");

        $response->assertStatus(200);
        $this->assertDatabaseMissing('price_list_assignments', ['id' => $assignment->id]);
    }

    #[Test]
    public function it_lists_only_assignments_within_the_users_own_branches()
    {
        $branch = $this->createBranch();
        $otherBranch = $this->createBranch();
        $priceList = $this->createPriceList();
        $this->createAssignment($priceList, $branch);
        $this->createAssignment($priceList, $otherBranch);

        $this->actingAsUserWithBranchAccess($branch, ['price_list_assignments.view']);

        $response = $this->getJson('/api/v1/pricing/price-list-assignments');

        $response->assertStatus(200);
        $this->assertCount(1, $response->json('data'));
    }
}
