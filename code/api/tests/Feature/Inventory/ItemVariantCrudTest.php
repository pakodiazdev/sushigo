<?php

namespace Tests\Feature\Inventory;

use App\Models\Stock;
use Illuminate\Foundation\Testing\RefreshDatabase;
use PHPUnit\Framework\Attributes\Test;

class ItemVariantCrudTest extends InventoryTestCase
{
    use RefreshDatabase;


    #[Test]
    public function it_can_list_item_variants()
    {
        // Arrange
        $item = $this->createItem();
        $this->createItemVariant($item, ['name' => 'Variant 1']);
        $this->createItemVariant($item, ['name' => 'Variant 2']);

        // Act
        $response = $this->getJson('/api/v1/item-variants');

        // Assert
        $response->assertStatus(200)
            ->assertJsonStructure([
                'status',
                'data' => [
                    '*' => ['id', 'code', 'name', 'item', 'unit_of_measure'],
                ],
                'meta',
            ]);

        $this->assertCount(2, $response->json('data'));
    }


    #[Test]
    public function it_can_filter_variants_by_item()
    {
        // Arrange
        $item1 = $this->createItem(['name' => 'Item 1']);
        $item2 = $this->createItem(['name' => 'Item 2']);

        $this->createItemVariant($item1);
        $this->createItemVariant($item1);
        $this->createItemVariant($item2);

        // Act
        $response = $this->getJson("/api/v1/item-variants?item_id={$item1->id}");

        // Assert
        $response->assertStatus(200);
        $this->assertCount(2, $response->json('data'));
    }


    #[Test]
    public function it_can_create_item_variant()
    {
        // Arrange
        $item = $this->createItem();

        // Act
        $response = $this->postJson('/api/v1/item-variants', [
            'item_id' => $item->id,
            'code' => 'SALM-1KG',
            'name' => 'Salmon 1kg Pack',
            'uom_id' => $this->uomKg->id,
            'min_stock' => 5,
            'max_stock' => 100,
            'notes' => 'Fresh salmon fillet',
        ]);

        // Assert
        $response->assertStatus(201)
            ->assertJsonFragment([
                'code' => 'SALM-1KG',
                'name' => 'Salmon 1kg Pack',
            ]);

        $this->assertDatabaseHas('item_variants', [
            'item_id' => $item->id,
            'code' => 'SALM-1KG',
            'min_stock' => 5,
            'max_stock' => 100,
            'avg_unit_cost' => 0, // Initialized to 0
            'last_unit_cost' => 0,
        ]);
    }


    #[Test]
    public function it_validates_code_uniqueness()
    {
        // Arrange
        $item = $this->createItem();
        $this->createItemVariant($item, ['code' => 'DUPLICATE-CODE']);

        // Act
        $response = $this->postJson('/api/v1/item-variants', [
            'item_id' => $item->id,
            'code' => 'DUPLICATE-CODE',
            'name' => 'Another Variant',
            'uom_id' => $this->uomKg->id,
        ]);

        // Assert
        $response->assertStatus(422)
            ->assertJsonValidationErrors(['code']);
    }


    #[Test]
    public function it_validates_min_max_stock()
    {
        // Arrange
        $item = $this->createItem();

        // Act: max_stock < min_stock
        $response = $this->postJson('/api/v1/item-variants', [
            'item_id' => $item->id,
            'code' => 'TEST-VAR',
            'name' => 'Test Variant',
            'uom_id' => $this->uomKg->id,
            'min_stock' => 100,
            'max_stock' => 50, // Invalid: max < min
        ]);

        // Assert
        $response->assertStatus(422)
            ->assertJsonValidationErrors(['max_stock']);
    }


    #[Test]
    public function it_can_show_item_variant_with_stock_totals()
    {
        // Arrange
        $item = $this->createItem();
        $variant = $this->createItemVariant($item);

        // Create stock records
        Stock::create([
            'inventory_location_id' => $this->location->id,
            'item_variant_id' => $variant->id,
            'on_hand' => 100,
            'reserved' => 20,
        ]);

        // Act
        $response = $this->getJson("/api/v1/item-variants/{$variant->id}");

        // Assert
        $response->assertStatus(200)
            ->assertJsonStructure([
                'status',
                'data' => [
                    'id',
                    'code',
                    'name',
                    'total_on_hand',
                    'total_reserved',
                    'total_available',
                    'item',
                    'uom',
                ],
            ])
            ->assertJsonFragment([
                'total_on_hand' => 100.0,
                'total_reserved' => 20.0,
                'total_available' => 80.0, // on_hand - reserved
            ]);
    }


    #[Test]
    public function it_can_update_item_variant()
    {
        // Arrange
        $item = $this->createItem();
        $variant = $this->createItemVariant($item, ['name' => 'Old Name']);

        // Act
        $response = $this->putJson("/api/v1/item-variants/{$variant->id}", [
            'name' => 'Updated Name',
            'min_stock' => 10,
            'max_stock' => 200,
        ]);

        // Assert
        $response->assertStatus(200)
            ->assertJsonFragment([
                'name' => 'Updated Name',
            ]);

        $this->assertDatabaseHas('item_variants', [
            'id' => $variant->id,
            'name' => 'Updated Name',
            'min_stock' => 10,
            'max_stock' => 200,
        ]);
    }


    #[Test]
    public function it_can_delete_variant_without_stock()
    {
        // Arrange
        $item = $this->createItem();
        $variant = $this->createItemVariant($item);

        // Act
        $response = $this->deleteJson("/api/v1/item-variants/{$variant->id}");

        // Assert
        $response->assertStatus(200);
        $this->assertSoftDeleted('item_variants', ['id' => $variant->id]);
    }


    #[Test]
    public function it_cannot_delete_variant_with_stock()
    {
        // Arrange
        $item = $this->createItem();
        $variant = $this->createItemVariant($item);

        // Create stock
        Stock::create([
            'inventory_location_id' => $this->location->id,
            'item_variant_id' => $variant->id,
            'on_hand' => 50,
            'reserved' => 0,
        ]);

        // Act
        $response = $this->deleteJson("/api/v1/item-variants/{$variant->id}");

        // Assert
        $response->assertStatus(409);
        $this->assertDatabaseHas('item_variants', ['id' => $variant->id]);
    }


    #[Test]
    public function it_can_filter_active_variants()
    {
        // Arrange
        $item = $this->createItem();
        $this->createItemVariant($item, ['is_active' => true]);
        $this->createItemVariant($item, ['is_active' => true]);
        $this->createItemVariant($item, ['is_active' => false]);

        // Act
        $response = $this->getJson('/api/v1/item-variants?is_active=1');

        // Assert
        $response->assertStatus(200);
        $this->assertCount(2, $response->json('data'));
    }


    #[Test]
    public function it_auto_uppercases_code()
    {
        // Arrange
        $item = $this->createItem();

        // Act
        $response = $this->postJson('/api/v1/item-variants', [
            'item_id' => $item->id,
            'code' => 'salm-1kg',
            'name' => 'Salmon 1kg',
            'uom_id' => $this->uomKg->id,
        ]);

        // Assert
        $response->assertStatus(201);

        $this->assertDatabaseHas('item_variants', [
            'code' => 'SALM-1KG', // Uppercased
        ]);
    }
}
