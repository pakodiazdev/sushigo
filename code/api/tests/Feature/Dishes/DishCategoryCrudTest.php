<?php

namespace Tests\Feature\Dishes;

use PHPUnit\Framework\Attributes\Test;

class DishCategoryCrudTest extends DishesTestCase
{
    #[Test]
    public function it_can_list_dish_categories()
    {
        $this->createCategory(['name' => 'Rollos']);
        $this->createCategory(['name' => 'Ramen']);

        $response = $this->getJson('/api/v1/dish-categories');

        $response->assertStatus(200)
            ->assertJsonStructure([
                'data' => [
                    '*' => ['id', 'name', 'position', 'is_active', 'dishes_count'],
                ],
            ]);

        $this->assertCount(2, $response->json('data'));
    }

    #[Test]
    public function it_can_filter_dish_categories_by_active_status()
    {
        $this->createCategory(['is_active' => true]);
        $this->createCategory(['is_active' => false]);

        $response = $this->getJson('/api/v1/dish-categories?is_active=1');

        $response->assertStatus(200);
        $this->assertCount(1, $response->json('data'));
    }

    #[Test]
    public function it_can_show_dish_category()
    {
        $category = $this->createCategory(['name' => 'Rollos']);
        $this->createDish($category);

        $response = $this->getJson("/api/v1/dish-categories/{$category->public_id}");

        $response->assertStatus(200)
            ->assertJsonFragment(['id' => $category->public_id, 'name' => 'Rollos', 'dishes_count' => 1]);
    }

    #[Test]
    public function it_can_create_dish_category()
    {
        $response = $this->postJson('/api/v1/dish-categories', [
            'name' => 'Onigiris',
            'position' => 2,
        ]);

        $response->assertStatus(201)
            ->assertJsonFragment(['name' => 'Onigiris', 'position' => 2, 'is_active' => true, 'dishes_count' => 0]);

        $this->assertDatabaseHas('dish_categories', ['name' => 'Onigiris', 'position' => 2]);
    }

    #[Test]
    public function it_validates_required_fields_on_create()
    {
        $response = $this->postJson('/api/v1/dish-categories', []);

        $response->assertStatus(422)->assertJsonValidationErrors(['name']);
    }

    #[Test]
    public function it_can_update_dish_category()
    {
        $category = $this->createCategory(['name' => 'Old Name']);
        $this->createDish($category);

        $response = $this->putJson("/api/v1/dish-categories/{$category->public_id}", [
            'name' => 'New Name',
            'is_active' => false,
        ]);

        $response->assertStatus(200)
            ->assertJsonFragment(['name' => 'New Name', 'is_active' => false, 'dishes_count' => 1]);
        $this->assertDatabaseHas('dish_categories', ['id' => $category->id, 'name' => 'New Name']);
    }

    #[Test]
    public function it_can_delete_dish_category()
    {
        $category = $this->createCategory();

        $response = $this->deleteJson("/api/v1/dish-categories/{$category->public_id}");

        $response->assertStatus(204);
        $this->assertSoftDeleted('dish_categories', ['id' => $category->id]);
    }

    #[Test]
    public function it_cascades_soft_delete_to_dishes_extra_groups_and_options()
    {
        $category = $this->createCategory();
        $dish = $this->createDish($category);
        $group = $this->createExtraGroup($dish);
        $option = $this->createExtraOption($group);

        $response = $this->deleteJson("/api/v1/dish-categories/{$category->public_id}");

        $response->assertStatus(204);
        $this->assertSoftDeleted('dishes', ['id' => $dish->id]);
        $this->assertSoftDeleted('dish_extra_groups', ['id' => $group->id]);
        $this->assertSoftDeleted('dish_extra_options', ['id' => $option->id]);
    }

    #[Test]
    public function it_rejects_requests_without_dishes_view_permission()
    {
        $this->user->removeRole('admin');

        $response = $this->getJson('/api/v1/dish-categories');

        $response->assertStatus(403);
    }

    #[Test]
    public function it_rejects_create_without_dishes_create_permission()
    {
        $this->user->removeRole('admin');

        $response = $this->postJson('/api/v1/dish-categories', ['name' => 'Nueva']);

        $response->assertStatus(403);
    }
}
