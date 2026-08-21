<?php

namespace Tests\Feature\Inventory;

use App\Models\Item;
use App\Models\ItemVariant;
use App\Models\Stock;
use App\Models\StockMovement;
use PHPUnit\Framework\Attributes\Test;

class ProductVariantCrudTest extends InventoryTestCase
{
    #[Test]
    public function it_lists_only_variants_of_the_given_product()
    {
        $product = $this->createProduct();
        $otherProduct = $this->createProduct();
        $this->createItemVariant($product, ['code' => 'VAR-A']);
        $this->createItemVariant($product, ['code' => 'VAR-B']);
        $this->createItemVariant($otherProduct, ['code' => 'VAR-C']);

        $response = $this->getJson("/api/v1/inventory/products/{$product->id}/variants");

        $response->assertStatus(200);
        $this->assertCount(2, $response->json('data'));
    }

    #[Test]
    public function it_rejects_listing_variants_for_a_non_product_parent()
    {
        $insumo = $this->createItem(['type' => Item::TYPE_INSUMO]);

        $response = $this->getJson("/api/v1/inventory/products/{$insumo->id}/variants");

        $response->assertStatus(404);
    }

    #[Test]
    public function it_rejects_a_zero_per_page_on_list_instead_of_crashing()
    {
        $product = $this->createProduct();
        $this->createItemVariant($product);

        $response = $this->getJson("/api/v1/inventory/products/{$product->id}/variants?per_page=0");

        $response->assertStatus(422)->assertJsonValidationErrors(['per_page']);
    }

    #[Test]
    public function it_rejects_a_non_numeric_per_page_on_list()
    {
        $product = $this->createProduct();

        $response = $this->getJson("/api/v1/inventory/products/{$product->id}/variants?per_page=abc");

        $response->assertStatus(422)->assertJsonValidationErrors(['per_page']);
    }

    #[Test]
    public function it_rejects_a_per_page_above_the_maximum_on_list()
    {
        $product = $this->createProduct();

        $response = $this->getJson("/api/v1/inventory/products/{$product->id}/variants?per_page=101");

        $response->assertStatus(422)->assertJsonValidationErrors(['per_page']);
    }

    #[Test]
    public function it_can_create_a_variant_with_only_required_fields()
    {
        $product = $this->createProduct();

        $response = $this->postJson("/api/v1/inventory/products/{$product->id}/variants", [
            'name' => 'Arroz Premium 1kg',
            'code' => 'arr-kg',
            'uom_id' => $this->uomKg->id,
        ]);

        $response->assertStatus(201)
            ->assertJsonFragment(['name' => 'Arroz Premium 1kg', 'code' => 'ARR-KG', 'is_active' => true]);

        $this->assertDatabaseHas('item_variants', [
            'item_id' => $product->id,
            'code' => 'ARR-KG',
            'name' => 'Arroz Premium 1kg',
        ]);
    }

    #[Test]
    public function it_forces_item_id_from_the_route_not_the_body()
    {
        $product = $this->createProduct();
        $otherProduct = $this->createProduct();

        $response = $this->postJson("/api/v1/inventory/products/{$product->id}/variants", [
            'name' => 'Arroz Premium 1kg',
            'code' => 'ARR-KG',
            'uom_id' => $this->uomKg->id,
            'item_id' => $otherProduct->id,
        ]);

        $response->assertStatus(201);
        $this->assertDatabaseHas('item_variants', [
            'code' => 'ARR-KG',
            'item_id' => $product->id,
        ]);
    }

    #[Test]
    public function it_can_create_a_variant_with_barcode_description_and_lot_tracking()
    {
        $product = $this->createProduct();

        $response = $this->postJson("/api/v1/inventory/products/{$product->id}/variants", [
            'name' => 'Arroz Premium 1kg',
            'code' => 'ARR-KG',
            'barcode' => '750 1234-567890',
            'uom_id' => $this->uomKg->id,
            'description' => 'Presentacion de 1 kilogramo',
            'track_lot' => true,
            'track_serial' => true,
            'is_active' => false,
        ]);

        $response->assertStatus(201)
            ->assertJsonFragment([
                'barcode' => '7501234567890',
                'description' => 'Presentacion de 1 kilogramo',
                'track_lot' => true,
                'track_serial' => true,
                'is_active' => false,
            ]);
    }

    #[Test]
    public function it_accepts_a_numeric_code_and_barcode_on_create_instead_of_crashing()
    {
        $product = $this->createProduct();

        $response = $this->postJson("/api/v1/inventory/products/{$product->id}/variants", [
            'name' => 'Arroz Premium 1kg',
            'code' => 12345,
            'barcode' => 7501234567890,
            'uom_id' => $this->uomKg->id,
        ]);

        $response->assertStatus(201)
            ->assertJsonFragment(['code' => '12345', 'barcode' => '7501234567890']);
    }

    #[Test]
    public function it_requires_name_code_and_uom_on_create()
    {
        $product = $this->createProduct();

        $response = $this->postJson("/api/v1/inventory/products/{$product->id}/variants", []);

        $response->assertStatus(422)->assertJsonValidationErrors(['name', 'code', 'uom_id']);
    }

    #[Test]
    public function it_rejects_an_invalid_uom_on_create()
    {
        $product = $this->createProduct();

        $response = $this->postJson("/api/v1/inventory/products/{$product->id}/variants", [
            'name' => 'Arroz Premium 1kg',
            'code' => 'ARR-KG',
            'uom_id' => 999999,
        ]);

        $response->assertStatus(422)->assertJsonValidationErrors(['uom_id']);
    }

    #[Test]
    public function it_rejects_a_duplicate_code_on_create()
    {
        $product = $this->createProduct();
        $this->createItemVariant($product, ['code' => 'ARR-KG']);

        $response = $this->postJson("/api/v1/inventory/products/{$product->id}/variants", [
            'name' => 'Another',
            'code' => 'ARR-KG',
            'uom_id' => $this->uomKg->id,
        ]);

        $response->assertStatus(422)->assertJsonValidationErrors(['code']);
    }

    #[Test]
    public function it_rejects_a_duplicate_barcode_on_create()
    {
        $product = $this->createProduct();
        $this->createItemVariant($product, ['code' => 'EXISTING', 'barcode' => '7501234567890']);

        $response = $this->postJson("/api/v1/inventory/products/{$product->id}/variants", [
            'name' => 'Another',
            'code' => 'NEW-CODE',
            'barcode' => '7501234567890',
            'uom_id' => $this->uomKg->id,
        ]);

        $response->assertStatus(422)->assertJsonValidationErrors(['barcode']);
    }

    #[Test]
    public function it_ignores_cost_price_and_stock_fields_on_create()
    {
        $product = $this->createProduct();

        $response = $this->postJson("/api/v1/inventory/products/{$product->id}/variants", [
            'name' => 'Arroz Premium 1kg',
            'code' => 'ARR-KG',
            'uom_id' => $this->uomKg->id,
            'sale_price' => 25.50,
            'min_stock' => 10,
            'max_stock' => 100,
            'last_unit_cost' => 5,
            'avg_unit_cost' => 5,
        ]);

        $response->assertStatus(201);
        $variant = ItemVariant::where('code', 'ARR-KG')->firstOrFail();
        $this->assertNull($variant->sale_price);
        $this->assertSame('0.0000', (string) $variant->min_stock);
        $this->assertSame('0.0000', (string) $variant->max_stock);
        $this->assertSame('0.0000', (string) $variant->last_unit_cost);
    }

    #[Test]
    public function it_rejects_creating_a_variant_for_a_non_product_parent()
    {
        $insumo = $this->createItem(['type' => Item::TYPE_INSUMO]);

        $response = $this->postJson("/api/v1/inventory/products/{$insumo->id}/variants", [
            'name' => 'Arroz Premium 1kg',
            'code' => 'ARR-KG',
            'uom_id' => $this->uomKg->id,
        ]);

        $response->assertStatus(404);
    }

    #[Test]
    public function it_shows_a_variant_scoped_to_its_product()
    {
        $product = $this->createProduct();
        $variant = $this->createItemVariant($product, ['code' => 'ARR-KG', 'name' => 'Arroz']);

        $response = $this->getJson("/api/v1/inventory/products/{$product->id}/variants/{$variant->id}");

        $response->assertStatus(200)->assertJsonFragment(['code' => 'ARR-KG', 'name' => 'Arroz']);
    }

    #[Test]
    public function it_returns_not_found_when_the_variant_does_not_belong_to_the_product()
    {
        $product = $this->createProduct();
        $otherProduct = $this->createProduct();
        $variant = $this->createItemVariant($otherProduct);

        $response = $this->getJson("/api/v1/inventory/products/{$product->id}/variants/{$variant->id}");

        $response->assertStatus(404);
    }

    #[Test]
    public function it_can_update_a_variant()
    {
        $product = $this->createProduct();
        $variant = $this->createItemVariant($product, ['name' => 'Old Name', 'code' => 'OLD-CODE']);

        $response = $this->putJson("/api/v1/inventory/products/{$product->id}/variants/{$variant->id}", [
            'name' => 'New Name',
        ]);

        $response->assertStatus(200)->assertJsonFragment(['name' => 'New Name', 'code' => 'OLD-CODE']);
        $this->assertDatabaseHas('item_variants', ['id' => $variant->id, 'name' => 'New Name']);
    }

    #[Test]
    public function it_allows_resending_the_same_code_and_barcode_on_update()
    {
        $product = $this->createProduct();
        $variant = $this->createItemVariant($product, ['code' => 'ARR-KG', 'barcode' => '7501234567890']);

        $response = $this->putJson("/api/v1/inventory/products/{$product->id}/variants/{$variant->id}", [
            'code' => 'ARR-KG',
            'barcode' => '7501234567890',
            'name' => 'Renamed',
        ]);

        $response->assertStatus(200)->assertJsonFragment(['name' => 'Renamed']);
    }

    #[Test]
    public function it_accepts_a_numeric_code_and_barcode_on_update_instead_of_crashing()
    {
        $product = $this->createProduct();
        $variant = $this->createItemVariant($product, ['code' => 'OLD-CODE']);

        $response = $this->putJson("/api/v1/inventory/products/{$product->id}/variants/{$variant->id}", [
            'code' => 12345,
            'barcode' => 7501234567890,
        ]);

        $response->assertStatus(200)
            ->assertJsonFragment(['code' => '12345', 'barcode' => '7501234567890']);
    }

    #[Test]
    public function it_rejects_reassigning_a_variant_to_another_variants_code_on_update()
    {
        $product = $this->createProduct();
        $this->createItemVariant($product, ['code' => 'TAKEN']);
        $variant = $this->createItemVariant($product, ['code' => 'MINE']);

        $response = $this->putJson("/api/v1/inventory/products/{$product->id}/variants/{$variant->id}", [
            'code' => 'TAKEN',
        ]);

        $response->assertStatus(422)->assertJsonValidationErrors(['code']);
    }

    #[Test]
    public function it_rejects_reassigning_a_variant_to_another_variants_barcode_on_update()
    {
        $product = $this->createProduct();
        $this->createItemVariant($product, ['code' => 'A', 'barcode' => '7501234567890']);
        $variant = $this->createItemVariant($product, ['code' => 'B', 'barcode' => '7509999999999']);

        $response = $this->putJson("/api/v1/inventory/products/{$product->id}/variants/{$variant->id}", [
            'barcode' => '7501234567890',
        ]);

        $response->assertStatus(422)->assertJsonValidationErrors(['barcode']);
    }

    #[Test]
    public function it_ignores_cost_price_and_stock_fields_on_update()
    {
        $product = $this->createProduct();
        $variant = $this->createItemVariant($product);

        $response = $this->putJson("/api/v1/inventory/products/{$product->id}/variants/{$variant->id}", [
            'sale_price' => 99,
            'min_stock' => 50,
            'max_stock' => 500,
        ]);

        $response->assertStatus(200);
        $variant->refresh();
        $this->assertSame('0.0000', (string) $variant->min_stock);
    }

    #[Test]
    public function it_rejects_changing_the_base_uom_once_the_variant_has_stock()
    {
        $product = $this->createProduct();
        $variant = $this->createItemVariant($product, ['uom_id' => $this->uomKg->id]);
        Stock::create([
            'inventory_location_id' => $this->location->id,
            'item_variant_id' => $variant->id,
            'on_hand' => 10,
            'reserved' => 0,
        ]);

        $response = $this->putJson("/api/v1/inventory/products/{$product->id}/variants/{$variant->id}", [
            'uom_id' => $this->uomGr->id,
        ]);

        $response->assertStatus(422)->assertJsonValidationErrors(['uom_id']);
    }

    #[Test]
    public function it_rejects_changing_the_base_uom_once_the_variant_has_movement_history()
    {
        $product = $this->createProduct();
        $variant = $this->createItemVariant($product, ['uom_id' => $this->uomKg->id]);
        StockMovement::create([
            'to_location_id' => $this->location->id,
            'item_variant_id' => $variant->id,
            'qty' => 5,
            'reason' => 'OPENING_BALANCE',
        ]);

        $response = $this->putJson("/api/v1/inventory/products/{$product->id}/variants/{$variant->id}", [
            'uom_id' => $this->uomGr->id,
        ]);

        $response->assertStatus(422)->assertJsonValidationErrors(['uom_id']);
    }

    #[Test]
    public function it_allows_resending_the_same_uom_once_the_variant_has_stock()
    {
        $product = $this->createProduct();
        $variant = $this->createItemVariant($product, ['uom_id' => $this->uomKg->id]);
        Stock::create([
            'inventory_location_id' => $this->location->id,
            'item_variant_id' => $variant->id,
            'on_hand' => 10,
            'reserved' => 0,
        ]);

        $response = $this->putJson("/api/v1/inventory/products/{$product->id}/variants/{$variant->id}", [
            'uom_id' => $this->uomKg->id,
            'name' => 'Renamed',
        ]);

        $response->assertStatus(200)->assertJsonFragment(['name' => 'Renamed']);
    }

    #[Test]
    public function it_allows_changing_the_base_uom_when_the_variant_has_no_stock_or_history()
    {
        $product = $this->createProduct();
        $variant = $this->createItemVariant($product, ['uom_id' => $this->uomKg->id]);

        $response = $this->putJson("/api/v1/inventory/products/{$product->id}/variants/{$variant->id}", [
            'uom_id' => $this->uomGr->id,
        ]);

        $response->assertStatus(200);
        $variant->refresh();
        $this->assertSame($this->uomGr->id, $variant->uom_id);
    }

    #[Test]
    public function it_rejects_changing_the_base_uom_once_the_variant_has_a_purchase_presentation()
    {
        $product = $this->createProduct();
        $variant = $this->createItemVariant($product, ['uom_id' => $this->uomKg->id]);
        $template = $this->createPurchasePresentationTemplate(['compatible_dimension_uom_id' => $this->uomKg->id]);
        $this->createVariantPurchasePresentation($variant, $template);

        $response = $this->putJson("/api/v1/inventory/products/{$product->id}/variants/{$variant->id}", [
            'uom_id' => $this->uomGr->id,
        ]);

        $response->assertStatus(422)->assertJsonValidationErrors(['uom_id']);
    }

    #[Test]
    public function it_returns_not_found_updating_a_variant_that_does_not_belong_to_the_product()
    {
        $product = $this->createProduct();
        $otherProduct = $this->createProduct();
        $variant = $this->createItemVariant($otherProduct);

        $response = $this->putJson("/api/v1/inventory/products/{$product->id}/variants/{$variant->id}", [
            'name' => 'New Name',
        ]);

        $response->assertStatus(404);
    }

    #[Test]
    public function it_can_delete_a_variant_without_stock()
    {
        $product = $this->createProduct();
        $variant = $this->createItemVariant($product);

        $response = $this->deleteJson("/api/v1/inventory/products/{$product->id}/variants/{$variant->id}");

        $response->assertStatus(200);
        $this->assertSoftDeleted('item_variants', ['id' => $variant->id]);
    }

    #[Test]
    public function it_blocks_deleting_a_variant_with_stock_on_hand()
    {
        $product = $this->createProduct();
        $variant = $this->createItemVariant($product);

        Stock::create([
            'inventory_location_id' => $this->location->id,
            'item_variant_id' => $variant->id,
            'on_hand' => 10,
            'reserved' => 0,
        ]);

        $response = $this->deleteJson("/api/v1/inventory/products/{$product->id}/variants/{$variant->id}");

        $response->assertStatus(409);
        $this->assertDatabaseHas('item_variants', ['id' => $variant->id]);
    }

    #[Test]
    public function it_returns_not_found_deleting_a_variant_that_does_not_belong_to_the_product()
    {
        $product = $this->createProduct();
        $otherProduct = $this->createProduct();
        $variant = $this->createItemVariant($otherProduct);

        $response = $this->deleteJson("/api/v1/inventory/products/{$product->id}/variants/{$variant->id}");

        $response->assertStatus(404);
    }

    #[Test]
    public function it_rejects_list_without_items_view_permission()
    {
        $product = $this->createProduct();
        $this->user->removeRole('inventory-manager');

        $response = $this->getJson("/api/v1/inventory/products/{$product->id}/variants");

        $response->assertStatus(403);
    }

    #[Test]
    public function it_rejects_show_without_items_view_permission()
    {
        $product = $this->createProduct();
        $variant = $this->createItemVariant($product);
        $this->user->removeRole('inventory-manager');

        $response = $this->getJson("/api/v1/inventory/products/{$product->id}/variants/{$variant->id}");

        $response->assertStatus(403);
    }

    #[Test]
    public function it_rejects_create_without_items_create_permission()
    {
        $product = $this->createProduct();
        $this->user->removeRole('inventory-manager');

        $response = $this->postJson("/api/v1/inventory/products/{$product->id}/variants", [
            'name' => 'Arroz', 'code' => 'ARR', 'uom_id' => $this->uomKg->id,
        ]);

        $response->assertStatus(403);
    }

    #[Test]
    public function it_rejects_update_without_items_update_permission()
    {
        $product = $this->createProduct();
        $variant = $this->createItemVariant($product);
        $this->user->removeRole('inventory-manager');

        $response = $this->putJson("/api/v1/inventory/products/{$product->id}/variants/{$variant->id}", [
            'name' => 'New',
        ]);

        $response->assertStatus(403);
    }

    #[Test]
    public function it_rejects_delete_without_items_delete_permission()
    {
        $product = $this->createProduct();
        $variant = $this->createItemVariant($product);
        $this->user->removeRole('inventory-manager');

        $response = $this->deleteJson("/api/v1/inventory/products/{$product->id}/variants/{$variant->id}");

        $response->assertStatus(403);
    }

    #[Test]
    public function it_rejects_unauthenticated_list_request()
    {
        $product = $this->createProduct();
        auth()->forgetGuards();

        $response = $this->getJson("/api/v1/inventory/products/{$product->id}/variants");

        $response->assertStatus(401);
    }

    #[Test]
    public function it_rejects_unauthenticated_create_request()
    {
        $product = $this->createProduct();
        auth()->forgetGuards();

        $response = $this->postJson("/api/v1/inventory/products/{$product->id}/variants", [
            'name' => 'Arroz', 'code' => 'ARR', 'uom_id' => $this->uomKg->id,
        ]);

        $response->assertStatus(401);
    }

    #[Test]
    public function it_rejects_unauthenticated_show_request()
    {
        $product = $this->createProduct();
        $variant = $this->createItemVariant($product);
        auth()->forgetGuards();

        $response = $this->getJson("/api/v1/inventory/products/{$product->id}/variants/{$variant->id}");

        $response->assertStatus(401);
    }

    #[Test]
    public function it_rejects_unauthenticated_update_request()
    {
        $product = $this->createProduct();
        $variant = $this->createItemVariant($product);
        auth()->forgetGuards();

        $response = $this->putJson("/api/v1/inventory/products/{$product->id}/variants/{$variant->id}", [
            'name' => 'New',
        ]);

        $response->assertStatus(401);
    }

    #[Test]
    public function it_rejects_unauthenticated_delete_request()
    {
        $product = $this->createProduct();
        $variant = $this->createItemVariant($product);
        auth()->forgetGuards();

        $response = $this->deleteJson("/api/v1/inventory/products/{$product->id}/variants/{$variant->id}");

        $response->assertStatus(401);
    }
}
