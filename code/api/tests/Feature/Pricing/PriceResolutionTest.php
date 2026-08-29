<?php

namespace Tests\Feature\Pricing;

use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Schema;
use PHPUnit\Framework\Attributes\Test;

class PriceResolutionTest extends PricingTestCase
{
    #[Test]
    public function the_same_variant_resolves_to_different_prices_in_two_branches()
    {
        $this->actingAsUserWithoutBranchAccess(['price_lists.view']);
        $variant = $this->createItemVariant();

        $branchA = $this->createBranch();
        $listA = $this->createPriceList();
        $this->createAssignment($listA, $branchA);
        $this->createVariantPrice($variant, $listA, ['price' => '100.0000']);

        $branchB = $this->createBranch();
        $listB = $this->createPriceList();
        $this->createAssignment($listB, $branchB);
        $this->createVariantPrice($variant, $listB, ['price' => '250.0000']);

        $responseA = $this->getJson('/api/v1/pricing/resolve?'.http_build_query([
            'item_variant_id' => $variant->public_id,
            'branch_id' => $branchA->id,
        ]));
        $responseB = $this->getJson('/api/v1/pricing/resolve?'.http_build_query([
            'item_variant_id' => $variant->public_id,
            'branch_id' => $branchB->id,
        ]));

        $responseA->assertStatus(200)->assertJsonPath('data.resolved', true)->assertJsonPath('data.price', '100.0000');
        $responseB->assertStatus(200)->assertJsonPath('data.resolved', true)->assertJsonPath('data.price', '250.0000');
    }

    #[Test]
    public function it_returns_an_explicit_no_price_result_when_nothing_is_configured()
    {
        $this->actingAsUserWithoutBranchAccess(['price_lists.view']);
        $variant = $this->createItemVariant();
        $branch = $this->createBranch();

        $response = $this->getJson('/api/v1/pricing/resolve?'.http_build_query([
            'item_variant_id' => $variant->public_id,
            'branch_id' => $branch->id,
        ]));

        $response->assertStatus(200)
            ->assertJsonPath('data.resolved', false)
            ->assertJsonPath('data.price', null)
            ->assertJsonPath('data.price_list', null);
    }

    #[Test]
    public function it_never_falls_back_to_item_variant_sale_price()
    {
        // The per-Variant sale_price fallback column was dropped in #442, so this
        // is now structurally guaranteed — resolution has nothing to fall back to.
        $this->actingAsUserWithoutBranchAccess(['price_lists.view']);
        $this->assertFalse(Schema::hasColumn('item_variants', 'sale_price'));
        $variant = $this->createItemVariant();
        $branch = $this->createBranch();

        $response = $this->getJson('/api/v1/pricing/resolve?'.http_build_query([
            'item_variant_id' => $variant->public_id,
            'branch_id' => $branch->id,
        ]));

        $response->assertStatus(200)->assertJsonPath('data.resolved', false);
    }

    #[Test]
    public function the_higher_priority_list_wins_when_two_lists_are_assigned_to_the_same_branch()
    {
        $this->actingAsUserWithoutBranchAccess(['price_lists.view']);
        $variant = $this->createItemVariant();
        $branch = $this->createBranch();

        $standard = $this->createPriceList(['priority' => 0]);
        $this->createAssignment($standard, $branch);
        $this->createVariantPrice($variant, $standard, ['price' => '100.0000']);

        $event = $this->createPriceList(['priority' => 10]);
        $this->createAssignment($event, $branch);
        $this->createVariantPrice($variant, $event, ['price' => '75.0000']);

        $response = $this->getJson('/api/v1/pricing/resolve?'.http_build_query([
            'item_variant_id' => $variant->public_id,
            'branch_id' => $branch->id,
        ]));

        $response->assertStatus(200)
            ->assertJsonPath('data.resolved', true)
            ->assertJsonPath('data.price', '75.0000')
            ->assertJsonPath('data.price_list.code', $event->code);
    }

    #[Test]
    public function an_operating_unit_assignment_overrides_its_parent_branch_assignment()
    {
        $this->actingAsUserWithoutBranchAccess(['price_lists.view']);
        $variant = $this->createItemVariant();
        $branch = $this->createBranch();
        $operatingUnit = $this->createOperatingUnit($branch, ['type' => 'EVENT_TEMP']);

        $branchList = $this->createPriceList(['priority' => 0]);
        $this->createAssignment($branchList, $branch);
        $this->createVariantPrice($variant, $branchList, ['price' => '100.0000']);

        $ouList = $this->createPriceList(['priority' => 0]);
        $this->createAssignment($ouList, $branch, $operatingUnit);
        $this->createVariantPrice($variant, $ouList, ['price' => '60.0000']);

        $response = $this->getJson('/api/v1/pricing/resolve?'.http_build_query([
            'item_variant_id' => $variant->public_id,
            'branch_id' => $branch->id,
            'operating_unit_id' => $operatingUnit->id,
        ]));

        $response->assertStatus(200)
            ->assertJsonPath('data.resolved', true)
            ->assertJsonPath('data.price', '60.0000');
    }

    #[Test]
    public function it_falls_through_to_the_branch_level_price_when_the_operating_units_list_has_no_price_for_this_variant()
    {
        $this->actingAsUserWithoutBranchAccess(['price_lists.view']);
        $variant = $this->createItemVariant();
        $branch = $this->createBranch();
        $operatingUnit = $this->createOperatingUnit($branch, ['type' => 'EVENT_TEMP']);

        $branchList = $this->createPriceList(['priority' => 0]);
        $this->createAssignment($branchList, $branch);
        $this->createVariantPrice($variant, $branchList, ['price' => '100.0000']);

        // OU-level list is assigned but has no price entry at all for this Variant.
        $ouList = $this->createPriceList(['priority' => 0]);
        $this->createAssignment($ouList, $branch, $operatingUnit);

        $response = $this->getJson('/api/v1/pricing/resolve?'.http_build_query([
            'item_variant_id' => $variant->public_id,
            'branch_id' => $branch->id,
            'operating_unit_id' => $operatingUnit->id,
        ]));

        $response->assertStatus(200)
            ->assertJsonPath('data.resolved', true)
            ->assertJsonPath('data.price', '100.0000');
    }

    #[Test]
    public function it_ignores_an_assignment_whose_effective_window_does_not_cover_as_of()
    {
        $this->actingAsUserWithoutBranchAccess(['price_lists.view']);
        $variant = $this->createItemVariant();
        $branch = $this->createBranch();

        $priceList = $this->createPriceList();
        $this->createAssignment($priceList, $branch, null, ['effective_from' => '2026-01-01', 'effective_to' => '2026-01-31']);
        $this->createVariantPrice($variant, $priceList, ['price' => '100.0000']);

        $response = $this->getJson('/api/v1/pricing/resolve?'.http_build_query([
            'item_variant_id' => $variant->public_id,
            'branch_id' => $branch->id,
            'as_of' => '2026-06-01',
        ]));

        $response->assertStatus(200)->assertJsonPath('data.resolved', false);
    }

    #[Test]
    public function it_ignores_an_inactive_assignment()
    {
        $this->actingAsUserWithoutBranchAccess(['price_lists.view']);
        $variant = $this->createItemVariant();
        $branch = $this->createBranch();

        $priceList = $this->createPriceList();
        $this->createAssignment($priceList, $branch, null, ['is_active' => false]);
        $this->createVariantPrice($variant, $priceList, ['price' => '100.0000']);

        $response = $this->getJson('/api/v1/pricing/resolve?'.http_build_query([
            'item_variant_id' => $variant->public_id,
            'branch_id' => $branch->id,
        ]));

        $response->assertStatus(200)->assertJsonPath('data.resolved', false);
    }

    #[Test]
    public function it_requires_view_permission_to_resolve()
    {
        $this->actingAsUserWithoutBranchAccess([]);
        $variant = $this->createItemVariant();
        $branch = $this->createBranch();

        $response = $this->getJson('/api/v1/pricing/resolve?'.http_build_query([
            'item_variant_id' => $variant->public_id,
            'branch_id' => $branch->id,
        ]));

        $response->assertStatus(403);
    }

    #[Test]
    public function it_rejects_an_operating_unit_that_does_not_belong_to_the_given_branch()
    {
        $this->actingAsUserWithoutBranchAccess(['price_lists.view']);
        $variant = $this->createItemVariant();
        $branch = $this->createBranch();
        $otherBranch = $this->createBranch();
        $foreignOu = $this->createOperatingUnit($otherBranch);

        $response = $this->getJson('/api/v1/pricing/resolve?'.http_build_query([
            'item_variant_id' => $variant->public_id,
            'branch_id' => $branch->id,
            'operating_unit_id' => $foreignOu->id,
        ]));

        $response->assertStatus(422)->assertJsonValidationErrors(['operating_unit_id']);
    }

    #[Test]
    public function it_defaults_as_of_to_todays_date_in_the_business_timezone_not_utc()
    {
        // 02:00 UTC is still 20:00 the previous day in America/Mexico_City
        // (UTC-6, no DST since 2022) — resolving without an explicit as_of
        // must use the business-timezone date, not Carbon::now()'s UTC one.
        Carbon::setTestNow('2026-01-15 02:00:00');

        try {
            $this->actingAsUserWithoutBranchAccess(['price_lists.view']);
            $variant = $this->createItemVariant();
            $branch = $this->createBranch();
            $priceList = $this->createPriceList();
            $this->createAssignment($priceList, $branch, null, ['effective_from' => '2026-01-01', 'effective_to' => '2026-01-14']);
            $this->createVariantPrice($variant, $priceList, ['effective_from' => '2026-01-01', 'effective_to' => '2026-01-14']);

            $response = $this->getJson('/api/v1/pricing/resolve?'.http_build_query([
                'item_variant_id' => $variant->public_id,
                'branch_id' => $branch->id,
            ]));

            $response->assertStatus(200)
                ->assertJsonPath('data.as_of', '2026-01-14')
                ->assertJsonPath('data.resolved', true);
        } finally {
            Carbon::setTestNow(null);
        }
    }

    #[Test]
    public function it_rejects_a_soft_deleted_item_variant_reference_instead_of_404ing()
    {
        $this->actingAsUserWithoutBranchAccess(['price_lists.view']);
        $branch = $this->createBranch();
        $variant = $this->createItemVariant();
        $variant->delete();

        $response = $this->getJson('/api/v1/pricing/resolve?'.http_build_query([
            'item_variant_id' => $variant->public_id,
            'branch_id' => $branch->id,
        ]));

        $response->assertStatus(422)->assertJsonValidationErrors(['item_variant_id']);
    }

    #[Test]
    public function it_does_not_add_a_confusing_operating_unit_error_when_branch_id_itself_is_invalid()
    {
        $this->actingAsUserWithoutBranchAccess(['price_lists.view']);
        $variant = $this->createItemVariant();
        $branch = $this->createBranch();
        $operatingUnit = $this->createOperatingUnit($branch);

        $response = $this->getJson('/api/v1/pricing/resolve?'.http_build_query([
            'item_variant_id' => $variant->public_id,
            'branch_id' => 999999,
            'operating_unit_id' => $operatingUnit->id,
        ]));

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['branch_id'])
            ->assertJsonMissingValidationErrors(['operating_unit_id']);
    }
}
