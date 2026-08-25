<?php

namespace Tests\Feature\Pricing;

use PHPUnit\Framework\Attributes\Test;

class VariantPriceCrudTest extends PricingTestCase
{
    #[Test]
    public function it_creates_a_variant_price()
    {
        $this->actingAsUserWithoutBranchAccess(['price_lists.update']);
        $priceList = $this->createPriceList();
        $variant = $this->createItemVariant();

        $response = $this->postJson("/api/v1/pricing/price-lists/{$priceList->public_id}/variant-prices", [
            'item_variant_id' => $variant->public_id,
            'price' => '129.5000',
            'effective_from' => '2026-01-01',
        ]);

        $response->assertStatus(201)
            ->assertJsonPath('data.price', '129.5000')
            ->assertJsonPath('data.price_list_id', $priceList->public_id);

        $this->assertDatabaseHas('variant_prices', [
            'item_variant_id' => $variant->id,
            'price_list_id' => $priceList->id,
        ]);
    }

    #[Test]
    public function it_requires_price_lists_update_permission_to_create()
    {
        $this->actingAsUserWithoutBranchAccess([]);
        $priceList = $this->createPriceList();
        $variant = $this->createItemVariant();

        $response = $this->postJson("/api/v1/pricing/price-lists/{$priceList->public_id}/variant-prices", [
            'item_variant_id' => $variant->public_id,
            'price' => '129.5000',
            'effective_from' => '2026-01-01',
        ]);

        $response->assertStatus(403);
    }

    #[Test]
    public function it_rejects_a_price_exceeding_the_stored_decimal_precision()
    {
        $this->actingAsUserWithoutBranchAccess(['price_lists.update']);
        $priceList = $this->createPriceList();
        $variant = $this->createItemVariant();

        $response = $this->postJson("/api/v1/pricing/price-lists/{$priceList->public_id}/variant-prices", [
            'item_variant_id' => $variant->public_id,
            'price' => '100000000000',
            'effective_from' => '2026-01-01',
        ]);

        $response->assertStatus(422)->assertJsonValidationErrors(['price']);
    }

    #[Test]
    public function it_rejects_a_price_with_more_than_four_decimal_places()
    {
        $this->actingAsUserWithoutBranchAccess(['price_lists.update']);
        $priceList = $this->createPriceList();
        $variant = $this->createItemVariant();

        $response = $this->postJson("/api/v1/pricing/price-lists/{$priceList->public_id}/variant-prices", [
            'item_variant_id' => $variant->public_id,
            'price' => '10.00001',
            'effective_from' => '2026-01-01',
        ]);

        $response->assertStatus(422)->assertJsonValidationErrors(['price']);
    }

    #[Test]
    public function it_rejects_a_negative_price()
    {
        $this->actingAsUserWithoutBranchAccess(['price_lists.update']);
        $priceList = $this->createPriceList();
        $variant = $this->createItemVariant();

        $response = $this->postJson("/api/v1/pricing/price-lists/{$priceList->public_id}/variant-prices", [
            'item_variant_id' => $variant->public_id,
            'price' => '-1.00',
            'effective_from' => '2026-01-01',
        ]);

        $response->assertStatus(422)->assertJsonValidationErrors(['price']);
    }

    #[Test]
    public function it_rejects_an_overlapping_active_price_for_the_same_variant_and_price_list()
    {
        $this->actingAsUserWithoutBranchAccess(['price_lists.update']);
        $priceList = $this->createPriceList();
        $variant = $this->createItemVariant();
        $this->createVariantPrice($variant, $priceList, ['effective_from' => '2026-01-01', 'effective_to' => '2026-06-30']);

        $response = $this->postJson("/api/v1/pricing/price-lists/{$priceList->public_id}/variant-prices", [
            'item_variant_id' => $variant->public_id,
            'price' => '150.0000',
            'effective_from' => '2026-03-01',
        ]);

        $response->assertStatus(422)->assertJsonValidationErrors(['effective_from']);
    }

    #[Test]
    public function it_allows_a_non_overlapping_price_for_the_same_variant_and_price_list()
    {
        $this->actingAsUserWithoutBranchAccess(['price_lists.update']);
        $priceList = $this->createPriceList();
        $variant = $this->createItemVariant();
        $this->createVariantPrice($variant, $priceList, ['effective_from' => '2026-01-01', 'effective_to' => '2026-06-30']);

        $response = $this->postJson("/api/v1/pricing/price-lists/{$priceList->public_id}/variant-prices", [
            'item_variant_id' => $variant->public_id,
            'price' => '150.0000',
            'effective_from' => '2026-07-01',
        ]);

        $response->assertStatus(201);
    }

    #[Test]
    public function it_lists_variant_prices_for_a_price_list()
    {
        $this->actingAsUserWithoutBranchAccess(['price_lists.view']);
        $priceList = $this->createPriceList();
        $variant = $this->createItemVariant();
        $this->createVariantPrice($variant, $priceList);

        $response = $this->getJson("/api/v1/pricing/price-lists/{$priceList->public_id}/variant-prices");

        $response->assertStatus(200);
        $this->assertCount(1, $response->json('data'));
        $response->assertJsonPath('data.0.price_list_id', $priceList->public_id);
    }

    #[Test]
    public function it_updates_a_variant_price()
    {
        $this->actingAsUserWithoutBranchAccess(['price_lists.update']);
        $priceList = $this->createPriceList();
        $variant = $this->createItemVariant();
        $price = $this->createVariantPrice($variant, $priceList, ['price' => '100.0000']);

        $response = $this->putJson("/api/v1/pricing/price-lists/{$priceList->public_id}/variant-prices/{$price->public_id}", [
            'price' => '200.0000',
        ]);

        $response->assertStatus(200)
            ->assertJsonPath('data.price', '200.0000')
            ->assertJsonPath('data.price_list_id', $priceList->public_id);
    }

    #[Test]
    public function it_allows_an_inactive_price_to_overlap_an_active_one()
    {
        $this->actingAsUserWithoutBranchAccess(['price_lists.update']);
        $priceList = $this->createPriceList();
        $variant = $this->createItemVariant();
        $this->createVariantPrice($variant, $priceList, ['effective_from' => '2026-01-01', 'effective_to' => '2026-06-30']);

        $response = $this->postJson("/api/v1/pricing/price-lists/{$priceList->public_id}/variant-prices", [
            'item_variant_id' => $variant->public_id,
            'price' => '150.0000',
            'effective_from' => '2026-03-01',
            'is_active' => false,
        ]);

        $response->assertStatus(201);
    }

    #[Test]
    public function it_allows_updating_a_price_to_inactive_even_if_it_would_otherwise_overlap()
    {
        $this->actingAsUserWithoutBranchAccess(['price_lists.update']);
        $priceList = $this->createPriceList();
        $variant = $this->createItemVariant();
        $this->createVariantPrice($variant, $priceList, ['effective_from' => '2026-01-01', 'effective_to' => '2026-06-30']);
        $price = $this->createVariantPrice($variant, $priceList, ['effective_from' => '2026-07-01', 'effective_to' => null]);

        $response = $this->putJson("/api/v1/pricing/price-lists/{$priceList->public_id}/variant-prices/{$price->public_id}", [
            'effective_from' => '2026-01-01',
            'is_active' => false,
        ]);

        $response->assertStatus(200)->assertJsonPath('data.is_active', false);
    }

    #[Test]
    public function it_rejects_a_soft_deleted_item_variant_reference_instead_of_crashing()
    {
        $this->actingAsUserWithoutBranchAccess(['price_lists.update']);
        $priceList = $this->createPriceList();
        $variant = $this->createItemVariant();
        $variant->delete();

        $response = $this->postJson("/api/v1/pricing/price-lists/{$priceList->public_id}/variant-prices", [
            'item_variant_id' => $variant->public_id,
            'price' => '100.0000',
            'effective_from' => '2026-01-01',
        ]);

        $response->assertStatus(422)->assertJsonValidationErrors(['item_variant_id']);
    }

    #[Test]
    public function it_rejects_a_partial_update_with_a_non_iso_date_that_would_still_invert_the_range()
    {
        $this->actingAsUserWithoutBranchAccess(['price_lists.update']);
        $priceList = $this->createPriceList();
        $variant = $this->createItemVariant();
        $price = $this->createVariantPrice($variant, $priceList, ['effective_from' => '2026-01-01', 'effective_to' => '2026-06-30']);

        $response = $this->putJson("/api/v1/pricing/price-lists/{$priceList->public_id}/variant-prices/{$price->public_id}", [
            'effective_from' => '08/01/2026',
        ]);

        $response->assertStatus(422)->assertJsonValidationErrors(['effective_to']);
    }

    #[Test]
    public function it_rejects_a_partial_update_that_would_put_effective_from_after_the_stored_effective_to()
    {
        $this->actingAsUserWithoutBranchAccess(['price_lists.update']);
        $priceList = $this->createPriceList();
        $variant = $this->createItemVariant();
        $price = $this->createVariantPrice($variant, $priceList, ['effective_from' => '2026-01-01', 'effective_to' => '2026-06-30']);

        $response = $this->putJson("/api/v1/pricing/price-lists/{$priceList->public_id}/variant-prices/{$price->public_id}", [
            'effective_from' => '2026-08-01',
        ]);

        $response->assertStatus(422)->assertJsonValidationErrors(['effective_to']);
    }

    #[Test]
    public function it_deletes_a_variant_price()
    {
        $this->actingAsUserWithoutBranchAccess(['price_lists.update']);
        $priceList = $this->createPriceList();
        $variant = $this->createItemVariant();
        $price = $this->createVariantPrice($variant, $priceList);

        $response = $this->deleteJson("/api/v1/pricing/price-lists/{$priceList->public_id}/variant-prices/{$price->public_id}");

        $response->assertStatus(200);
        $this->assertSoftDeleted('variant_prices', ['id' => $price->id]);
    }
}
