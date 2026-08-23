<?php

namespace Tests\Feature\Inventory;

use App\Models\PurchasePresentationTemplate;
use PHPUnit\Framework\Attributes\Test;

class PurchasePresentationTemplateCrudTest extends InventoryTestCase
{
    #[Test]
    public function it_can_list_templates()
    {
        $this->createPurchasePresentationTemplate(['code' => 'BOX_24', 'name' => 'Box x24']);
        $this->createPurchasePresentationTemplate(['code' => 'PACK_6', 'name' => 'Pack x6', 'package_type' => PurchasePresentationTemplate::PACKAGE_TYPE_PACK, 'base_unit_quantity' => 6]);

        $response = $this->getJson('/api/v1/inventory/purchase-presentation-templates');

        $response->assertStatus(200)
            ->assertJsonStructure([
                'data' => [
                    '*' => ['id', 'code', 'name', 'package_type', 'base_unit_quantity', 'is_active'],
                ],
            ]);

        $this->assertCount(2, $response->json('data'));
    }

    #[Test]
    public function it_can_filter_templates_by_active_status()
    {
        $this->createPurchasePresentationTemplate(['is_active' => true]);
        $this->createPurchasePresentationTemplate(['is_active' => false]);

        $response = $this->getJson('/api/v1/inventory/purchase-presentation-templates?is_active=1');

        $response->assertStatus(200);
        $this->assertCount(1, $response->json('data'));
    }

    #[Test]
    public function it_can_filter_templates_by_package_type()
    {
        $this->createPurchasePresentationTemplate(['package_type' => PurchasePresentationTemplate::PACKAGE_TYPE_BOX]);
        $this->createPurchasePresentationTemplate(['package_type' => PurchasePresentationTemplate::PACKAGE_TYPE_UNIT, 'code' => 'UNIT']);

        $response = $this->getJson('/api/v1/inventory/purchase-presentation-templates?package_type=UNIT');

        $response->assertStatus(200);
        $this->assertCount(1, $response->json('data'));
        $this->assertSame('UNIT', $response->json('data.0.package_type'));
    }

    #[Test]
    public function it_can_show_template()
    {
        $template = $this->createPurchasePresentationTemplate(['code' => 'BOX_24', 'name' => 'Box x24']);

        $response = $this->getJson("/api/v1/inventory/purchase-presentation-templates/{$template->public_id}");

        $response->assertStatus(200)
            ->assertJsonFragment(['id' => $template->public_id, 'code' => 'BOX_24', 'name' => 'Box x24']);
    }

    #[Test]
    public function it_can_create_template()
    {
        $response = $this->postJson('/api/v1/inventory/purchase-presentation-templates', [
            'code' => 'box_24',
            'name' => 'Box x24',
            'package_type' => 'BOX',
            'base_unit_quantity' => 24,
            'compatible_dimension_uom_id' => $this->uomKg->public_id,
        ]);

        $response->assertStatus(201)
            ->assertJsonFragment(['code' => 'BOX_24', 'name' => 'Box x24', 'is_active' => true])
            ->assertJsonPath('data.compatible_dimension_uom.id', $this->uomKg->public_id);

        $this->assertDatabaseHas('purchase_presentation_templates', ['code' => 'BOX_24']);
    }

    #[Test]
    public function it_validates_required_fields_on_create()
    {
        $response = $this->postJson('/api/v1/inventory/purchase-presentation-templates', []);

        $response->assertStatus(422)->assertJsonValidationErrors(['code', 'name', 'package_type', 'base_unit_quantity', 'compatible_dimension_uom_id']);
    }

    #[Test]
    public function it_rejects_an_invalid_package_type()
    {
        $response = $this->postJson('/api/v1/inventory/purchase-presentation-templates', [
            'code' => 'BOX_24',
            'name' => 'Box x24',
            'package_type' => 'CRATE',
            'base_unit_quantity' => 24,
            'compatible_dimension_uom_id' => $this->uomKg->public_id,
        ]);

        $response->assertStatus(422)->assertJsonValidationErrors(['package_type']);
    }

    #[Test]
    public function it_validates_code_uniqueness()
    {
        $this->createPurchasePresentationTemplate(['code' => 'BOX_24']);

        $response = $this->postJson('/api/v1/inventory/purchase-presentation-templates', [
            'code' => 'BOX_24',
            'name' => 'Box x24 duplicate',
            'package_type' => 'BOX',
            'base_unit_quantity' => 24,
            'compatible_dimension_uom_id' => $this->uomKg->public_id,
        ]);

        $response->assertStatus(422)->assertJsonValidationErrors(['code']);
    }

    #[Test]
    public function it_can_update_template()
    {
        $template = $this->createPurchasePresentationTemplate(['name' => 'Old Name']);

        $response = $this->putJson("/api/v1/inventory/purchase-presentation-templates/{$template->public_id}", [
            'name' => 'New Name',
        ]);

        $response->assertStatus(200)->assertJsonFragment(['name' => 'New Name']);
        $this->assertDatabaseHas('purchase_presentation_templates', ['id' => $template->id, 'name' => 'New Name']);
    }

    #[Test]
    public function it_blocks_changing_package_type_once_a_template_has_an_assignment()
    {
        $product = $this->createProduct();
        $variant = $this->createItemVariant($product, ['uom_id' => $this->uomKg->id]);
        $template = $this->createPurchasePresentationTemplate(['compatible_dimension_uom_id' => $this->uomKg->id]);
        $this->createVariantPurchasePresentation($variant, $template);

        $response = $this->putJson("/api/v1/inventory/purchase-presentation-templates/{$template->public_id}", [
            'package_type' => PurchasePresentationTemplate::PACKAGE_TYPE_PACK,
        ]);

        $response->assertStatus(422)->assertJsonValidationErrors(['package_type']);
    }

    #[Test]
    public function it_allows_resending_the_same_package_type_once_a_template_has_an_assignment()
    {
        $product = $this->createProduct();
        $variant = $this->createItemVariant($product, ['uom_id' => $this->uomKg->id]);
        $template = $this->createPurchasePresentationTemplate(['compatible_dimension_uom_id' => $this->uomKg->id, 'package_type' => PurchasePresentationTemplate::PACKAGE_TYPE_BOX]);
        $this->createVariantPurchasePresentation($variant, $template);

        $response = $this->putJson("/api/v1/inventory/purchase-presentation-templates/{$template->public_id}", [
            'package_type' => PurchasePresentationTemplate::PACKAGE_TYPE_BOX,
            'name' => 'Renamed',
        ]);

        $response->assertStatus(200);
    }

    #[Test]
    public function it_allows_resending_the_same_base_unit_quantity_as_a_plain_number_once_a_template_has_an_assignment()
    {
        $product = $this->createProduct();
        $variant = $this->createItemVariant($product, ['uom_id' => $this->uomKg->id]);
        $template = $this->createPurchasePresentationTemplate(['compatible_dimension_uom_id' => $this->uomKg->id, 'base_unit_quantity' => 24]);
        $this->createVariantPurchasePresentation($variant, $template);

        // The model's decimal:4 cast stores/returns "24.0000"; a client
        // round-tripping the resource's plain-number 24 must not be treated
        // as a change.
        $response = $this->putJson("/api/v1/inventory/purchase-presentation-templates/{$template->public_id}", [
            'base_unit_quantity' => 24,
            'name' => 'Renamed',
        ]);

        $response->assertStatus(200)->assertJsonFragment(['name' => 'Renamed']);
    }

    #[Test]
    public function it_allows_resending_the_same_public_uom_once_a_template_has_an_assignment()
    {
        $product = $this->createProduct();
        $variant = $this->createItemVariant($product, ['uom_id' => $this->uomKg->id]);
        $template = $this->createPurchasePresentationTemplate(['compatible_dimension_uom_id' => $this->uomKg->id]);
        $this->createVariantPurchasePresentation($variant, $template);

        $response = $this->putJson("/api/v1/inventory/purchase-presentation-templates/{$template->public_id}", [
            'compatible_dimension_uom_id' => $this->uomKg->public_id,
            'name' => 'Renamed',
        ]);

        $response->assertStatus(200)->assertJsonFragment(['name' => 'Renamed']);
    }

    #[Test]
    public function it_blocks_changing_base_unit_quantity_once_a_template_has_an_assignment()
    {
        $product = $this->createProduct();
        $variant = $this->createItemVariant($product, ['uom_id' => $this->uomKg->id]);
        $template = $this->createPurchasePresentationTemplate(['compatible_dimension_uom_id' => $this->uomKg->id, 'base_unit_quantity' => 24]);
        $this->createVariantPurchasePresentation($variant, $template);

        $response = $this->putJson("/api/v1/inventory/purchase-presentation-templates/{$template->public_id}", [
            'base_unit_quantity' => 48,
        ]);

        $response->assertStatus(422)->assertJsonValidationErrors(['base_unit_quantity']);
    }

    #[Test]
    public function it_can_delete_an_unreferenced_template()
    {
        $template = $this->createPurchasePresentationTemplate();

        $response = $this->deleteJson("/api/v1/inventory/purchase-presentation-templates/{$template->public_id}");

        $response->assertStatus(204);
        $this->assertSoftDeleted('purchase_presentation_templates', ['id' => $template->id]);
    }

    #[Test]
    public function it_blocks_deleting_a_template_referenced_by_an_assignment()
    {
        $product = $this->createProduct();
        $variant = $this->createItemVariant($product, ['uom_id' => $this->uomKg->id]);
        $template = $this->createPurchasePresentationTemplate(['compatible_dimension_uom_id' => $this->uomKg->id]);
        $this->createVariantPurchasePresentation($variant, $template);

        $response = $this->deleteJson("/api/v1/inventory/purchase-presentation-templates/{$template->public_id}");

        $response->assertStatus(422);
        $this->assertDatabaseHas('purchase_presentation_templates', ['id' => $template->id, 'deleted_at' => null]);
    }

    #[Test]
    public function it_allows_a_template_code_to_be_reused_after_the_original_is_deleted()
    {
        $template = $this->createPurchasePresentationTemplate(['code' => 'BOX_24']);
        $this->deleteJson("/api/v1/inventory/purchase-presentation-templates/{$template->public_id}")->assertStatus(204);

        $response = $this->postJson('/api/v1/inventory/purchase-presentation-templates', [
            'code' => 'BOX_24',
            'name' => 'Box x24',
            'package_type' => 'BOX',
            'base_unit_quantity' => 24,
            'compatible_dimension_uom_id' => $this->uomKg->public_id,
        ]);

        $response->assertStatus(201);
    }

    #[Test]
    public function it_rejects_requests_without_purchase_presentation_templates_view_permission()
    {
        $this->user->removeRole('inventory-manager');

        $response = $this->getJson('/api/v1/inventory/purchase-presentation-templates');

        $response->assertStatus(403);
    }

    #[Test]
    public function it_rejects_create_without_purchase_presentation_templates_manage_permission()
    {
        $this->user->removeRole('inventory-manager');

        $response = $this->postJson('/api/v1/inventory/purchase-presentation-templates', ['code' => 'X']);

        $response->assertStatus(403);
    }

    #[Test]
    public function it_rejects_unauthenticated_list_request()
    {
        auth()->forgetGuards();

        $response = $this->getJson('/api/v1/inventory/purchase-presentation-templates');

        $response->assertStatus(401);
    }
}
