<?php

namespace Tests\Feature\Inventory;

use App\Models\Item;
use App\Models\ItemVariant;
use Illuminate\Foundation\Testing\RefreshDatabase;
use PHPUnit\Framework\Attributes\Test;

class ItemCrudTest extends InventoryTestCase
{
    use RefreshDatabase;

    
    #[Test]
    public function it_can_list_items()
    {
        // Arrange
        $this->createItem(['name' => 'Salmon', 'type' => 'INSUMO']);
        $this->createItem(['name' => 'Tuna', 'type' => 'INSUMO']);
        $this->createItem(['name' => 'Sushi Roll', 'type' => 'PRODUCTO']);

        // Act
        $response = $this->getJson('/api/v1/items');

        // Assert
        $response->assertStatus(200)
            ->assertJsonStructure([
                'status',
                'data' => [
                    '*' => ['id', 'sku', 'name', 'type', 'is_stocked', 'is_active'],
                ],
                'meta' => [
                    'current_page',
                    'total',
                ],
            ]);

        $this->assertCount(3, $response->json('data'));
    }

    
    #[Test]
    public function it_can_filter_items_by_type()
    {
        // Arrange
        $this->createItem(['type' => 'INSUMO']);
        $this->createItem(['type' => 'INSUMO']);
        $this->createItem(['type' => 'PRODUCTO']);

        // Act
        $response = $this->getJson('/api/v1/items?type=INSUMO');

        // Assert
        $response->assertStatus(200);
        $this->assertCount(2, $response->json('data'));
    }

    
    #[Test]
    public function it_can_search_items_by_name()
    {
        // Arrange
        $this->createItem(['name' => 'Fresh Salmon']);
        $this->createItem(['name' => 'Fresh Tuna']);
        $this->createItem(['name' => 'Rice']);

        // Act
        $response = $this->getJson('/api/v1/items?search=fresh');

        // Assert
        $response->assertStatus(200);
        $this->assertCount(2, $response->json('data'));
    }

    
    #[Test]
    public function it_can_create_item()
    {
        // Act
        $response = $this->postJson('/api/v1/items', [
            'sku' => 'SALM-001',
            'name' => 'Fresh Salmon',
            'type' => 'INSUMO',
            'description' => 'Premium Norwegian Salmon',
            'is_stocked' => true,
            'is_perishable' => true,
        ]);

        // Assert
        $response->assertStatus(201)
            ->assertJsonFragment([
                'sku' => 'SALM-001',
                'name' => 'Fresh Salmon',
                'type' => 'INSUMO',
            ]);

        $this->assertDatabaseHas('items', [
            'sku' => 'SALM-001',
            'name' => 'Fresh Salmon',
            'type' => 'INSUMO',
            'is_perishable' => true,
        ]);
    }

    
    #[Test]
    public function it_auto_uppercases_sku_and_type()
    {
        // Act
        $response = $this->postJson('/api/v1/items', [
            'sku' => 'salm-001',
            'name' => 'Fresh Salmon',
            'type' => 'insumo',
            'is_stocked' => true,
        ]);

        // Assert
        $response->assertStatus(201);
        
        $this->assertDatabaseHas('items', [
            'sku' => 'SALM-001', // Uppercased
            'type' => 'INSUMO', // Uppercased
        ]);
    }

    
    #[Test]
    public function it_validates_sku_uniqueness()
    {
        // Arrange
        $this->createItem(['sku' => 'DUPLICATE-SKU']);

        // Act
        $response = $this->postJson('/api/v1/items', [
            'sku' => 'DUPLICATE-SKU',
            'name' => 'Another Item',
            'type' => 'INSUMO',
        ]);

        // Assert
        $response->assertStatus(422)
            ->assertJsonValidationErrors(['sku']);
    }

    
    #[Test]
    public function it_validates_item_type()
    {
        // Act
        $response = $this->postJson('/api/v1/items', [
            'sku' => 'TEST-001',
            'name' => 'Test Item',
            'type' => 'INVALID_TYPE',
        ]);

        // Assert
        $response->assertStatus(422)
            ->assertJsonValidationErrors(['type']);
    }

    
    #[Test]
    public function it_can_show_item()
    {
        // Arrange
        $item = $this->createItem(['name' => 'Salmon']);
        $this->createItemVariant($item, ['name' => 'Salmon 1kg']);
        $this->createItemVariant($item, ['name' => 'Salmon 500g']);

        // Act
        $response = $this->getJson("/api/v1/items/{$item->id}");

        // Assert
        $response->assertStatus(200)
            ->assertJsonStructure([
                'status',
                'data' => [
                    'id',
                    'sku',
                    'name',
                    'type',
                    'variants_count',
                ],
            ])
            ->assertJsonFragment([
                'id' => $item->id,
                'variants_count' => 2,
            ]);
    }

    
    #[Test]
    public function it_can_update_item()
    {
        // Arrange
        $item = $this->createItem(['name' => 'Old Name']);

        // Act
        $response = $this->putJson("/api/v1/items/{$item->id}", [
            'name' => 'Updated Name',
            'description' => 'Updated description',
            'is_perishable' => true,
        ]);

        // Assert
        $response->assertStatus(200)
            ->assertJsonFragment([
                'name' => 'Updated Name',
            ]);

        $this->assertDatabaseHas('items', [
            'id' => $item->id,
            'name' => 'Updated Name',
            'is_perishable' => true,
        ]);
    }

    
    #[Test]
    public function it_can_delete_item_without_variants()
    {
        // Arrange
        $item = $this->createItem();

        // Act
        $response = $this->deleteJson("/api/v1/items/{$item->id}");

        // Assert
        $response->assertStatus(200);
        $this->assertSoftDeleted('items', ['id' => $item->id]);
    }

    
    #[Test]
    public function it_cannot_delete_item_with_variants()
    {
        // Arrange
        $item = $this->createItem();
        $this->createItemVariant($item);

        // Act
        $response = $this->deleteJson("/api/v1/items/{$item->id}");

        // Assert
        $response->assertStatus(409);
        $this->assertDatabaseHas('items', ['id' => $item->id]);
    }
}
