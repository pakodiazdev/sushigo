<?php

namespace Tests\Feature\Inventory;

use PHPUnit\Framework\Attributes\Test;

class InventoryCategoryCrudTest extends InventoryTestCase
{
    #[Test]
    public function it_can_list_inventory_categories()
    {
        $this->createInventoryCategory(['name' => 'Beverages']);
        $this->createInventoryCategory(['name' => 'Instant Noodles']);

        $response = $this->getJson('/api/v1/inventory-categories');

        $response->assertStatus(200)
            ->assertJsonStructure([
                'data' => [
                    '*' => ['id', 'name', 'position', 'is_active'],
                ],
            ]);

        $this->assertCount(2, $response->json('data'));
    }

    #[Test]
    public function it_can_filter_inventory_categories_by_active_status()
    {
        $this->createInventoryCategory(['is_active' => true]);
        $this->createInventoryCategory(['is_active' => false]);

        $response = $this->getJson('/api/v1/inventory-categories?is_active=1');

        $response->assertStatus(200);
        $this->assertCount(1, $response->json('data'));
    }

    #[Test]
    public function it_can_show_inventory_category()
    {
        $category = $this->createInventoryCategory(['name' => 'Beverages']);

        $response = $this->getJson("/api/v1/inventory-categories/{$category->public_id}");

        $response->assertStatus(200)
            ->assertJsonFragment(['id' => $category->public_id, 'name' => 'Beverages']);
    }

    #[Test]
    public function it_can_create_inventory_category()
    {
        $response = $this->postJson('/api/v1/inventory-categories', [
            'name' => 'Beverages',
            'position' => 2,
        ]);

        $response->assertStatus(201)
            ->assertJsonFragment(['name' => 'Beverages', 'position' => 2, 'is_active' => true]);

        $this->assertDatabaseHas('inventory_categories', ['name' => 'Beverages', 'position' => 2]);
    }

    #[Test]
    public function it_validates_required_fields_on_create()
    {
        $response = $this->postJson('/api/v1/inventory-categories', []);

        $response->assertStatus(422)->assertJsonValidationErrors(['name']);
    }

    #[Test]
    public function it_validates_category_name_uniqueness()
    {
        $this->createInventoryCategory(['name' => 'Beverages']);

        $response = $this->postJson('/api/v1/inventory-categories', ['name' => 'Beverages']);

        $response->assertStatus(422)->assertJsonValidationErrors(['name']);
    }

    #[Test]
    public function it_can_update_inventory_category()
    {
        $category = $this->createInventoryCategory(['name' => 'Old Name']);

        $response = $this->putJson("/api/v1/inventory-categories/{$category->public_id}", [
            'name' => 'New Name',
        ]);

        $response->assertStatus(200)
            ->assertJsonFragment(['name' => 'New Name']);
        $this->assertDatabaseHas('inventory_categories', ['id' => $category->id, 'name' => 'New Name']);
    }

    #[Test]
    public function it_can_deactivate_a_category_with_no_active_products()
    {
        $category = $this->createInventoryCategory();

        $response = $this->putJson("/api/v1/inventory-categories/{$category->public_id}", [
            'is_active' => false,
        ]);

        $response->assertStatus(200)->assertJsonFragment(['is_active' => false]);
    }

    #[Test]
    public function it_blocks_deactivating_a_category_referenced_by_an_active_product()
    {
        $category = $this->createInventoryCategory();
        $this->createProduct(['inventory_category_id' => $category->id, 'is_active' => true]);
        $this->createProduct(['inventory_category_id' => $category->id, 'is_active' => true]);

        $response = $this->putJson("/api/v1/inventory-categories/{$category->public_id}", [
            'is_active' => false,
        ]);

        $response->assertStatus(422)
            ->assertJsonFragment(['is_active' => ['Cannot deactivate this category: it still has 2 active Products. Deactivate or reassign them first.']]);
        $this->assertDatabaseHas('inventory_categories', ['id' => $category->id, 'is_active' => true]);
    }

    #[Test]
    public function it_allows_a_noop_edit_of_an_already_inactive_category_with_an_active_product()
    {
        $category = $this->createInventoryCategory(['is_active' => false]);
        $this->createProduct(['inventory_category_id' => $category->id, 'is_active' => true]);

        $response = $this->putJson("/api/v1/inventory-categories/{$category->public_id}", [
            'name' => 'Renamed Category',
            'is_active' => false,
        ]);

        $response->assertStatus(200)->assertJsonFragment(['name' => 'Renamed Category', 'is_active' => false]);
    }

    #[Test]
    public function it_allows_deactivating_a_category_whose_products_are_already_inactive()
    {
        $category = $this->createInventoryCategory();
        $this->createProduct(['inventory_category_id' => $category->id, 'is_active' => false]);

        $response = $this->putJson("/api/v1/inventory-categories/{$category->public_id}", [
            'is_active' => false,
        ]);

        $response->assertStatus(200);
    }

    #[Test]
    public function it_can_delete_inventory_category()
    {
        $category = $this->createInventoryCategory();

        $response = $this->deleteJson("/api/v1/inventory-categories/{$category->public_id}");

        $response->assertStatus(204);
        $this->assertSoftDeleted('inventory_categories', ['id' => $category->id]);
    }

    #[Test]
    public function it_blocks_deleting_a_category_referenced_by_an_active_product()
    {
        $category = $this->createInventoryCategory();
        $this->createProduct(['inventory_category_id' => $category->id, 'is_active' => true]);

        $response = $this->deleteJson("/api/v1/inventory-categories/{$category->public_id}");

        $response->assertStatus(422)
            ->assertJsonFragment(['inventory_category' => ['Cannot delete this category: it still has 1 active Product. Deactivate or reassign them first.']]);
        $this->assertDatabaseHas('inventory_categories', ['id' => $category->id, 'deleted_at' => null]);
    }

    #[Test]
    public function it_allows_a_category_name_to_be_reused_after_the_original_is_deleted()
    {
        $category = $this->createInventoryCategory(['name' => 'Beverages']);
        $this->deleteJson("/api/v1/inventory-categories/{$category->public_id}")->assertStatus(204);

        $response = $this->postJson('/api/v1/inventory-categories', ['name' => 'Beverages']);

        $response->assertStatus(201);
    }

    #[Test]
    public function it_rejects_requests_without_inventory_categories_view_permission()
    {
        $this->user->removeRole('inventory-manager');

        $response = $this->getJson('/api/v1/inventory-categories');

        $response->assertStatus(403);
    }

    #[Test]
    public function it_rejects_show_without_inventory_categories_view_permission()
    {
        $category = $this->createInventoryCategory();
        $this->user->removeRole('inventory-manager');

        $response = $this->getJson("/api/v1/inventory-categories/{$category->public_id}");

        $response->assertStatus(403);
    }

    #[Test]
    public function it_rejects_create_without_inventory_categories_create_permission()
    {
        $this->user->removeRole('inventory-manager');

        $response = $this->postJson('/api/v1/inventory-categories', ['name' => 'Nueva']);

        $response->assertStatus(403);
    }

    #[Test]
    public function it_rejects_update_without_inventory_categories_update_permission()
    {
        $category = $this->createInventoryCategory();
        $this->user->removeRole('inventory-manager');

        $response = $this->putJson("/api/v1/inventory-categories/{$category->public_id}", ['name' => 'Nueva']);

        $response->assertStatus(403);
    }

    #[Test]
    public function it_rejects_delete_without_inventory_categories_delete_permission()
    {
        $category = $this->createInventoryCategory();
        $this->user->removeRole('inventory-manager');

        $response = $this->deleteJson("/api/v1/inventory-categories/{$category->public_id}");

        $response->assertStatus(403);
    }

    #[Test]
    public function it_rejects_unauthenticated_list_request()
    {
        auth()->forgetGuards();

        $response = $this->getJson('/api/v1/inventory-categories');

        $response->assertStatus(401);
    }

    #[Test]
    public function it_rejects_unauthenticated_show_request()
    {
        $category = $this->createInventoryCategory();
        auth()->forgetGuards();

        $response = $this->getJson("/api/v1/inventory-categories/{$category->public_id}");

        $response->assertStatus(401);
    }

    #[Test]
    public function it_rejects_unauthenticated_create_request()
    {
        auth()->forgetGuards();

        $response = $this->postJson('/api/v1/inventory-categories', ['name' => 'Nueva']);

        $response->assertStatus(401);
    }

    #[Test]
    public function it_rejects_unauthenticated_update_request()
    {
        $category = $this->createInventoryCategory();
        auth()->forgetGuards();

        $response = $this->putJson("/api/v1/inventory-categories/{$category->public_id}", ['name' => 'Nueva']);

        $response->assertStatus(401);
    }

    #[Test]
    public function it_rejects_unauthenticated_delete_request()
    {
        $category = $this->createInventoryCategory();
        auth()->forgetGuards();

        $response = $this->deleteJson("/api/v1/inventory-categories/{$category->public_id}");

        $response->assertStatus(401);
    }
}
