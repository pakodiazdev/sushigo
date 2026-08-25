<?php

namespace Tests\Feature\Pricing;

use PHPUnit\Framework\Attributes\Test;

class PriceListCrudTest extends PricingTestCase
{
    #[Test]
    public function it_rejects_unauthenticated_requests()
    {
        $response = $this->getJson('/api/v1/pricing/price-lists');

        $response->assertStatus(401);
    }

    #[Test]
    public function it_rejects_users_without_permission()
    {
        $this->actingAsUserWithoutBranchAccess([]);

        $response = $this->getJson('/api/v1/pricing/price-lists');

        $response->assertStatus(403);
    }

    #[Test]
    public function it_creates_a_price_list()
    {
        $this->actingAsUserWithoutBranchAccess(['price_lists.create']);

        $response = $this->postJson('/api/v1/pricing/price-lists', [
            'code' => 'STANDARD',
            'name' => 'Standard Pricing',
            'priority' => 5,
        ]);

        $response->assertStatus(201)
            ->assertJsonPath('data.code', 'STANDARD')
            ->assertJsonPath('data.priority', 5)
            ->assertJsonPath('data.is_active', true);

        $this->assertDatabaseHas('price_lists', ['code' => 'STANDARD', 'priority' => 5]);
    }

    #[Test]
    public function it_rejects_a_duplicate_code()
    {
        $this->actingAsUserWithoutBranchAccess(['price_lists.create']);
        $this->createPriceList(['code' => 'STANDARD']);

        $response = $this->postJson('/api/v1/pricing/price-lists', [
            'code' => 'STANDARD',
            'name' => 'Another List',
        ]);

        $response->assertStatus(422)->assertJsonValidationErrors(['code']);
    }

    #[Test]
    public function it_lists_price_lists()
    {
        $this->actingAsUserWithoutBranchAccess(['price_lists.view']);
        $this->createPriceList(['code' => 'A']);
        $this->createPriceList(['code' => 'B']);

        $response = $this->getJson('/api/v1/pricing/price-lists');

        $response->assertStatus(200);
        $this->assertCount(2, $response->json('data'));
    }

    #[Test]
    public function it_shows_a_price_list()
    {
        $this->actingAsUserWithoutBranchAccess(['price_lists.view']);
        $priceList = $this->createPriceList(['code' => 'STANDARD']);

        $response = $this->getJson("/api/v1/pricing/price-lists/{$priceList->public_id}");

        $response->assertStatus(200)->assertJsonPath('data.code', 'STANDARD');
    }

    #[Test]
    public function it_updates_a_price_list()
    {
        $this->actingAsUserWithoutBranchAccess(['price_lists.update']);
        $priceList = $this->createPriceList(['priority' => 0]);

        $response = $this->putJson("/api/v1/pricing/price-lists/{$priceList->public_id}", [
            'priority' => 10,
        ]);

        $response->assertStatus(200)->assertJsonPath('data.priority', 10);
        $this->assertDatabaseHas('price_lists', ['id' => $priceList->id, 'priority' => 10]);
    }

    #[Test]
    public function it_rejects_a_priority_change_that_would_create_an_assignment_tie()
    {
        $this->actingAsUserWithoutBranchAccess(['price_lists.update']);
        $branch = $this->createBranch();
        $listA = $this->createPriceList(['priority' => 5]);
        $listB = $this->createPriceList(['priority' => 10]);
        $this->createAssignment($listA, $branch, null, ['effective_from' => '2026-01-01', 'effective_to' => '2026-06-30']);
        $this->createAssignment($listB, $branch, null, ['effective_from' => '2026-03-01', 'effective_to' => '2026-12-31']);

        // Both assignments overlap (2026-03-01..2026-06-30) but had distinct priorities (5 vs 10)
        // at creation time, so neither was rejected. Changing B's priority to match A's now would
        // make PriceResolutionService's tier-ordering ambiguous for that overlap window.
        $response = $this->putJson("/api/v1/pricing/price-lists/{$listB->public_id}", [
            'priority' => 5,
        ]);

        $response->assertStatus(422)->assertJsonValidationErrors(['priority']);
        $this->assertDatabaseHas('price_lists', ['id' => $listB->id, 'priority' => 10]);
    }

    #[Test]
    public function it_ignores_a_lingering_assignment_of_a_soft_deleted_price_list_when_changing_priority()
    {
        $this->actingAsUserWithoutBranchAccess(['price_lists.update']);
        $branch = $this->createBranch();
        $listA = $this->createPriceList(['priority' => 5]);
        $this->createAssignment($listA, $branch, null, ['effective_from' => '2026-01-01', 'effective_to' => '2026-06-30']);
        $listA->delete();

        $listC = $this->createPriceList(['priority' => 10]);
        $this->createAssignment($listC, $branch, null, ['effective_from' => '2026-03-01', 'effective_to' => '2026-12-31']);

        $response = $this->putJson("/api/v1/pricing/price-lists/{$listC->public_id}", [
            'priority' => 5,
        ]);

        $response->assertStatus(200)->assertJsonPath('data.priority', 5);
    }

    #[Test]
    public function it_allows_a_priority_change_that_does_not_create_an_assignment_tie()
    {
        $this->actingAsUserWithoutBranchAccess(['price_lists.update']);
        $branch = $this->createBranch();
        $listA = $this->createPriceList(['priority' => 5]);
        $listB = $this->createPriceList(['priority' => 10]);
        $this->createAssignment($listA, $branch, null, ['effective_from' => '2026-01-01', 'effective_to' => '2026-06-30']);
        $this->createAssignment($listB, $branch, null, ['effective_from' => '2026-07-01', 'effective_to' => null]);

        $response = $this->putJson("/api/v1/pricing/price-lists/{$listB->public_id}", [
            'priority' => 5,
        ]);

        $response->assertStatus(200)->assertJsonPath('data.priority', 5);
    }

    #[Test]
    public function it_deletes_a_price_list()
    {
        $this->actingAsUserWithoutBranchAccess(['price_lists.delete']);
        $priceList = $this->createPriceList();

        $response = $this->deleteJson("/api/v1/pricing/price-lists/{$priceList->public_id}");

        $response->assertStatus(200);
        $this->assertSoftDeleted('price_lists', ['id' => $priceList->id]);
    }
}
