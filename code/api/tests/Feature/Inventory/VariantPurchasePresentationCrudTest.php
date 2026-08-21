<?php

namespace Tests\Feature\Inventory;

use PHPUnit\Framework\Attributes\Test;

class VariantPurchasePresentationCrudTest extends InventoryTestCase
{
    #[Test]
    public function it_can_list_presentations_for_a_variant()
    {
        $product = $this->createProduct();
        $variant = $this->createItemVariant($product, ['uom_id' => $this->uomKg->id]);
        $template = $this->createPurchasePresentationTemplate(['compatible_dimension_uom_id' => $this->uomKg->id]);
        $this->createVariantPurchasePresentation($variant, $template);

        $response = $this->getJson("/api/v1/inventory/products/{$product->id}/variants/{$variant->id}/purchase-presentations");

        $response->assertStatus(200)
            ->assertJsonStructure([
                'data' => [
                    '*' => ['id', 'item_variant_id', 'template', 'is_default', 'is_active'],
                ],
            ]);

        $this->assertCount(1, $response->json('data'));
    }

    #[Test]
    public function it_can_show_a_presentation()
    {
        $product = $this->createProduct();
        $variant = $this->createItemVariant($product, ['uom_id' => $this->uomKg->id]);
        $template = $this->createPurchasePresentationTemplate(['compatible_dimension_uom_id' => $this->uomKg->id]);
        $presentation = $this->createVariantPurchasePresentation($variant, $template);

        $response = $this->getJson("/api/v1/inventory/products/{$product->id}/variants/{$variant->id}/purchase-presentations/{$presentation->public_id}");

        $response->assertStatus(200)->assertJsonFragment(['id' => $presentation->public_id]);
    }

    #[Test]
    public function it_can_assign_a_compatible_template_to_a_variant()
    {
        $product = $this->createProduct();
        $variant = $this->createItemVariant($product, ['uom_id' => $this->uomKg->id]);
        $template = $this->createPurchasePresentationTemplate(['compatible_dimension_uom_id' => $this->uomKg->id]);

        $response = $this->postJson("/api/v1/inventory/products/{$product->id}/variants/{$variant->id}/purchase-presentations", [
            'template_id' => $template->public_id,
            'package_barcode' => '7501234567913',
        ]);

        $response->assertStatus(201)
            ->assertJsonFragment(['package_barcode' => '7501234567913', 'is_default' => false]);

        $this->assertDatabaseHas('variant_purchase_presentations', [
            'item_variant_id' => $variant->id,
            'template_id' => $template->id,
        ]);
    }

    #[Test]
    public function it_rejects_an_unknown_template_public_id()
    {
        $product = $this->createProduct();
        $variant = $this->createItemVariant($product, ['uom_id' => $this->uomKg->id]);

        $response = $this->postJson("/api/v1/inventory/products/{$product->id}/variants/{$variant->id}/purchase-presentations", [
            'template_id' => '01JUNKNOWNPUBLICIDXXXXXXX',
        ]);

        $response->assertStatus(422)->assertJsonValidationErrors(['template_id']);
    }

    #[Test]
    public function it_rejects_a_soft_deleted_templates_public_id()
    {
        $product = $this->createProduct();
        $variant = $this->createItemVariant($product, ['uom_id' => $this->uomKg->id]);
        $template = $this->createPurchasePresentationTemplate(['compatible_dimension_uom_id' => $this->uomKg->id]);
        $templatePublicId = $template->public_id;
        $template->delete();

        $response = $this->postJson("/api/v1/inventory/products/{$product->id}/variants/{$variant->id}/purchase-presentations", [
            'template_id' => $templatePublicId,
        ]);

        $response->assertStatus(422)->assertJsonValidationErrors(['template_id']);
    }

    #[Test]
    public function it_rejects_a_template_whose_compatible_uom_does_not_match_the_variant_base_uom()
    {
        $product = $this->createProduct();
        $variant = $this->createItemVariant($product, ['uom_id' => $this->uomKg->id]);
        $template = $this->createPurchasePresentationTemplate(['compatible_dimension_uom_id' => $this->uomGr->id]);

        $response = $this->postJson("/api/v1/inventory/products/{$product->id}/variants/{$variant->id}/purchase-presentations", [
            'template_id' => $template->public_id,
        ]);

        $response->assertStatus(422)->assertJsonValidationErrors(['template_id']);
    }

    #[Test]
    public function it_rejects_assigning_an_inactive_template()
    {
        $product = $this->createProduct();
        $variant = $this->createItemVariant($product, ['uom_id' => $this->uomKg->id]);
        $template = $this->createPurchasePresentationTemplate(['compatible_dimension_uom_id' => $this->uomKg->id, 'is_active' => false]);

        $response = $this->postJson("/api/v1/inventory/products/{$product->id}/variants/{$variant->id}/purchase-presentations", [
            'template_id' => $template->public_id,
        ]);

        $response->assertStatus(422)->assertJsonValidationErrors(['template_id']);
    }

    #[Test]
    public function it_rejects_assigning_the_same_template_twice_to_the_same_variant()
    {
        $product = $this->createProduct();
        $variant = $this->createItemVariant($product, ['uom_id' => $this->uomKg->id]);
        $template = $this->createPurchasePresentationTemplate(['compatible_dimension_uom_id' => $this->uomKg->id]);
        $this->createVariantPurchasePresentation($variant, $template);

        $response = $this->postJson("/api/v1/inventory/products/{$product->id}/variants/{$variant->id}/purchase-presentations", [
            'template_id' => $template->public_id,
        ]);

        $response->assertStatus(422)->assertJsonValidationErrors(['template_id']);
    }

    #[Test]
    public function it_validates_package_barcode_uniqueness()
    {
        $product = $this->createProduct();
        $variant = $this->createItemVariant($product, ['uom_id' => $this->uomKg->id]);
        $template = $this->createPurchasePresentationTemplate(['compatible_dimension_uom_id' => $this->uomKg->id]);
        $this->createVariantPurchasePresentation($variant, $template, ['package_barcode' => 'DUPLICATE']);

        $otherTemplate = $this->createPurchasePresentationTemplate(['code' => 'OTHER', 'compatible_dimension_uom_id' => $this->uomKg->id]);

        $response = $this->postJson("/api/v1/inventory/products/{$product->id}/variants/{$variant->id}/purchase-presentations", [
            'template_id' => $otherTemplate->public_id,
            'package_barcode' => 'DUPLICATE',
        ]);

        $response->assertStatus(422)->assertJsonValidationErrors(['package_barcode']);
    }

    #[Test]
    public function setting_a_presentation_as_default_clears_the_previous_default()
    {
        $product = $this->createProduct();
        $variant = $this->createItemVariant($product, ['uom_id' => $this->uomKg->id]);
        $templateA = $this->createPurchasePresentationTemplate(['code' => 'A', 'compatible_dimension_uom_id' => $this->uomKg->id]);
        $templateB = $this->createPurchasePresentationTemplate(['code' => 'B', 'compatible_dimension_uom_id' => $this->uomKg->id]);
        $first = $this->createVariantPurchasePresentation($variant, $templateA, ['is_default' => true]);

        $response = $this->postJson("/api/v1/inventory/products/{$product->id}/variants/{$variant->id}/purchase-presentations", [
            'template_id' => $templateB->public_id,
            'is_default' => true,
        ]);

        $response->assertStatus(201)->assertJsonFragment(['is_default' => true]);

        $this->assertDatabaseHas('variant_purchase_presentations', ['id' => $first->id, 'is_default' => false]);
    }

    #[Test]
    public function updating_a_presentation_with_a_non_boolean_truthy_default_still_clears_the_previous_default()
    {
        $product = $this->createProduct();
        $variant = $this->createItemVariant($product, ['uom_id' => $this->uomKg->id]);
        $templateA = $this->createPurchasePresentationTemplate(['code' => 'A', 'compatible_dimension_uom_id' => $this->uomKg->id]);
        $templateB = $this->createPurchasePresentationTemplate(['code' => 'B', 'compatible_dimension_uom_id' => $this->uomKg->id]);
        $first = $this->createVariantPurchasePresentation($variant, $templateA, ['is_default' => true]);
        $second = $this->createVariantPurchasePresentation($variant, $templateB, ['is_default' => false]);

        // The request validation's `boolean` rule accepts 1 without casting
        // it to a real PHP bool, so this exercises the service's normalized
        // comparison rather than a strict `=== true` check.
        $response = $this->putJson("/api/v1/inventory/products/{$product->id}/variants/{$variant->id}/purchase-presentations/{$second->public_id}", [
            'is_default' => 1,
        ]);

        $response->assertStatus(200)->assertJsonFragment(['is_default' => true]);
        $this->assertDatabaseHas('variant_purchase_presentations', ['id' => $first->id, 'is_default' => false]);
        $this->assertDatabaseHas('variant_purchase_presentations', ['id' => $second->id, 'is_default' => true]);
    }

    #[Test]
    public function reactivating_an_already_default_presentation_clears_any_other_active_default()
    {
        $product = $this->createProduct();
        $variant = $this->createItemVariant($product, ['uom_id' => $this->uomKg->id]);
        $templateA = $this->createPurchasePresentationTemplate(['code' => 'A', 'compatible_dimension_uom_id' => $this->uomKg->id]);
        $templateB = $this->createPurchasePresentationTemplate(['code' => 'B', 'compatible_dimension_uom_id' => $this->uomKg->id]);
        $currentDefault = $this->createVariantPurchasePresentation($variant, $templateA, ['is_default' => true, 'is_active' => true]);
        // Simulates a row that was the default before being deactivated —
        // the partial unique index doesn't block is_default=true here
        // because is_active=false keeps it out of scope.
        $reactivating = $this->createVariantPurchasePresentation($variant, $templateB, ['is_default' => true, 'is_active' => false]);

        $response = $this->putJson("/api/v1/inventory/products/{$product->id}/variants/{$variant->id}/purchase-presentations/{$reactivating->public_id}", [
            'is_active' => true,
        ]);

        $response->assertStatus(200);
        $this->assertDatabaseHas('variant_purchase_presentations', ['id' => $currentDefault->id, 'is_default' => false]);
        $this->assertDatabaseHas('variant_purchase_presentations', ['id' => $reactivating->id, 'is_default' => true, 'is_active' => true]);
    }

    #[Test]
    public function it_can_update_a_presentation()
    {
        $product = $this->createProduct();
        $variant = $this->createItemVariant($product, ['uom_id' => $this->uomKg->id]);
        $template = $this->createPurchasePresentationTemplate(['compatible_dimension_uom_id' => $this->uomKg->id]);
        $presentation = $this->createVariantPurchasePresentation($variant, $template);

        $response = $this->putJson("/api/v1/inventory/products/{$product->id}/variants/{$variant->id}/purchase-presentations/{$presentation->public_id}", [
            'package_barcode' => 'NEWCODE',
        ]);

        $response->assertStatus(200)->assertJsonFragment(['package_barcode' => 'NEWCODE']);
    }

    #[Test]
    public function it_can_delete_a_presentation()
    {
        $product = $this->createProduct();
        $variant = $this->createItemVariant($product, ['uom_id' => $this->uomKg->id]);
        $template = $this->createPurchasePresentationTemplate(['compatible_dimension_uom_id' => $this->uomKg->id]);
        $presentation = $this->createVariantPurchasePresentation($variant, $template);

        $response = $this->deleteJson("/api/v1/inventory/products/{$product->id}/variants/{$variant->id}/purchase-presentations/{$presentation->public_id}");

        $response->assertStatus(204);
        $this->assertSoftDeleted('variant_purchase_presentations', ['id' => $presentation->id]);
    }

    #[Test]
    public function it_rejects_requests_without_items_view_permission()
    {
        $product = $this->createProduct();
        $variant = $this->createItemVariant($product, ['uom_id' => $this->uomKg->id]);
        $this->user->removeRole('inventory-manager');

        $response = $this->getJson("/api/v1/inventory/products/{$product->id}/variants/{$variant->id}/purchase-presentations");

        $response->assertStatus(403);
    }

    #[Test]
    public function it_rejects_unauthenticated_list_request()
    {
        $product = $this->createProduct();
        $variant = $this->createItemVariant($product, ['uom_id' => $this->uomKg->id]);
        auth()->forgetGuards();

        $response = $this->getJson("/api/v1/inventory/products/{$product->id}/variants/{$variant->id}/purchase-presentations");

        $response->assertStatus(401);
    }
}
