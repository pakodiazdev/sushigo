<?php

namespace Tests\Feature\Inventory;

use PHPUnit\Framework\Attributes\Test;

class BrandCrudTest extends InventoryTestCase
{
    #[Test]
    public function it_can_list_brands()
    {
        $this->createBrand(['name' => 'Coca-Cola']);
        $this->createBrand(['name' => 'Buldak']);

        $response = $this->getJson('/api/v1/brands');

        $response->assertStatus(200)
            ->assertJsonStructure([
                'data' => [
                    '*' => ['id', 'name', 'is_active'],
                ],
            ]);

        $this->assertCount(2, $response->json('data'));
    }

    #[Test]
    public function it_can_filter_brands_by_active_status()
    {
        $this->createBrand(['is_active' => true]);
        $this->createBrand(['is_active' => false]);

        $response = $this->getJson('/api/v1/brands?is_active=1');

        $response->assertStatus(200);
        $this->assertCount(1, $response->json('data'));
    }

    #[Test]
    public function it_can_show_brand()
    {
        $brand = $this->createBrand(['name' => 'Coca-Cola']);

        $response = $this->getJson("/api/v1/brands/{$brand->public_id}");

        $response->assertStatus(200)
            ->assertJsonFragment(['id' => $brand->public_id, 'name' => 'Coca-Cola']);
    }

    #[Test]
    public function it_can_create_brand()
    {
        $response = $this->postJson('/api/v1/brands', ['name' => 'Ramune']);

        $response->assertStatus(201)
            ->assertJsonFragment(['name' => 'Ramune', 'is_active' => true]);

        $this->assertDatabaseHas('brands', ['name' => 'Ramune']);
    }

    #[Test]
    public function it_validates_required_fields_on_create()
    {
        $response = $this->postJson('/api/v1/brands', []);

        $response->assertStatus(422)->assertJsonValidationErrors(['name']);
    }

    #[Test]
    public function it_validates_brand_name_uniqueness()
    {
        $this->createBrand(['name' => 'Buldak']);

        $response = $this->postJson('/api/v1/brands', ['name' => 'Buldak']);

        $response->assertStatus(422)->assertJsonValidationErrors(['name']);
    }

    #[Test]
    public function it_can_update_brand()
    {
        $brand = $this->createBrand(['name' => 'Old Name']);

        $response = $this->putJson("/api/v1/brands/{$brand->public_id}", [
            'name' => 'New Name',
            'is_active' => false,
        ]);

        $response->assertStatus(200)
            ->assertJsonFragment(['name' => 'New Name', 'is_active' => false]);
        $this->assertDatabaseHas('brands', ['id' => $brand->id, 'name' => 'New Name']);
    }

    #[Test]
    public function it_allows_keeping_its_own_name_on_update()
    {
        $brand = $this->createBrand(['name' => 'Buldak']);

        $response = $this->putJson("/api/v1/brands/{$brand->public_id}", ['name' => 'Buldak']);

        $response->assertStatus(200);
    }

    #[Test]
    public function it_can_delete_brand()
    {
        $brand = $this->createBrand();

        $response = $this->deleteJson("/api/v1/brands/{$brand->public_id}");

        $response->assertStatus(204);
        $this->assertSoftDeleted('brands', ['id' => $brand->id]);
    }

    #[Test]
    public function it_allows_a_brand_name_to_be_reused_after_the_original_is_deleted()
    {
        $brand = $this->createBrand(['name' => 'Coca-Cola']);
        $this->deleteJson("/api/v1/brands/{$brand->public_id}")->assertStatus(204);

        $response = $this->postJson('/api/v1/brands', ['name' => 'Coca-Cola']);

        $response->assertStatus(201);
    }

    #[Test]
    public function it_rejects_requests_without_brands_view_permission()
    {
        $this->user->removeRole('inventory-manager');

        $response = $this->getJson('/api/v1/brands');

        $response->assertStatus(403);
    }

    #[Test]
    public function it_rejects_show_without_brands_view_permission()
    {
        $brand = $this->createBrand();
        $this->user->removeRole('inventory-manager');

        $response = $this->getJson("/api/v1/brands/{$brand->public_id}");

        $response->assertStatus(403);
    }

    #[Test]
    public function it_rejects_create_without_brands_create_permission()
    {
        $this->user->removeRole('inventory-manager');

        $response = $this->postJson('/api/v1/brands', ['name' => 'Nueva']);

        $response->assertStatus(403);
    }

    #[Test]
    public function it_rejects_update_without_brands_update_permission()
    {
        $brand = $this->createBrand();
        $this->user->removeRole('inventory-manager');

        $response = $this->putJson("/api/v1/brands/{$brand->public_id}", ['name' => 'Nueva']);

        $response->assertStatus(403);
    }

    #[Test]
    public function it_rejects_delete_without_brands_delete_permission()
    {
        $brand = $this->createBrand();
        $this->user->removeRole('inventory-manager');

        $response = $this->deleteJson("/api/v1/brands/{$brand->public_id}");

        $response->assertStatus(403);
    }

    #[Test]
    public function it_rejects_unauthenticated_list_request()
    {
        auth()->forgetGuards();

        $response = $this->getJson('/api/v1/brands');

        $response->assertStatus(401);
    }

    #[Test]
    public function it_rejects_unauthenticated_show_request()
    {
        $brand = $this->createBrand();
        auth()->forgetGuards();

        $response = $this->getJson("/api/v1/brands/{$brand->public_id}");

        $response->assertStatus(401);
    }

    #[Test]
    public function it_rejects_unauthenticated_create_request()
    {
        auth()->forgetGuards();

        $response = $this->postJson('/api/v1/brands', ['name' => 'Nueva']);

        $response->assertStatus(401);
    }

    #[Test]
    public function it_rejects_unauthenticated_update_request()
    {
        $brand = $this->createBrand();
        auth()->forgetGuards();

        $response = $this->putJson("/api/v1/brands/{$brand->public_id}", ['name' => 'Nueva']);

        $response->assertStatus(401);
    }

    #[Test]
    public function it_rejects_unauthenticated_delete_request()
    {
        $brand = $this->createBrand();
        auth()->forgetGuards();

        $response = $this->deleteJson("/api/v1/brands/{$brand->public_id}");

        $response->assertStatus(401);
    }
}
