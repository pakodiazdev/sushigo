<?php

namespace Tests\Feature\Dishes;

use PHPUnit\Framework\Attributes\Test;

class DishExtraOptionCrudTest extends DishesTestCase
{
    #[Test]
    public function it_can_list_extra_options_filtered_by_group()
    {
        $group = $this->createExtraGroup();
        $this->createExtraOption($group, ['name' => 'Soya']);
        $this->createExtraOption($this->createExtraGroup(), ['name' => 'Otra opcion']);

        $response = $this->getJson("/api/v1/dish-extra-options?dish_extra_group_id={$group->public_id}");

        $response->assertStatus(200);
        $this->assertCount(1, $response->json('data'));
    }

    #[Test]
    public function it_groups_unfiltered_list_by_extra_group_before_ordering_by_position()
    {
        $groupA = $this->createExtraGroup(null, ['name' => 'Salsas']);
        $groupB = $this->createExtraGroup(null, ['name' => 'Extras']);
        // Create out of group order, with clashing position values across
        // groups, to prove sorting doesn't just interleave on position alone.
        $this->createExtraOption($groupB, ['name' => 'B0', 'position' => 0]);
        $this->createExtraOption($groupA, ['name' => 'A1', 'position' => 1]);
        $this->createExtraOption($groupA, ['name' => 'A0', 'position' => 0]);
        $this->createExtraOption($groupB, ['name' => 'B1', 'position' => 1]);

        $response = $this->getJson('/api/v1/dish-extra-options');

        $response->assertStatus(200);
        $names = array_column($response->json('data'), 'name');
        $this->assertSame(['A0', 'A1', 'B0', 'B1'], $names);
    }

    #[Test]
    public function it_can_show_extra_option()
    {
        $option = $this->createExtraOption(null, ['name' => 'Soya', 'price_delta' => 5]);

        $response = $this->getJson("/api/v1/dish-extra-options/{$option->public_id}");

        $response->assertStatus(200)->assertJsonFragment(['name' => 'Soya', 'price_delta' => 5.0]);
    }

    #[Test]
    public function it_can_create_extra_option()
    {
        $group = $this->createExtraGroup();

        $response = $this->postJson('/api/v1/dish-extra-options', [
            'dish_extra_group_id' => $group->public_id,
            'name' => 'Salsa picante',
            'price_delta' => 10.00,
        ]);

        $response->assertStatus(201)
            ->assertJsonFragment(['name' => 'Salsa picante', 'price_delta' => 10.0]);

        $this->assertDatabaseHas('dish_extra_options', [
            'dish_extra_group_id' => $group->id,
            'name' => 'Salsa picante',
        ]);
    }

    #[Test]
    public function it_validates_required_fields_on_create()
    {
        $response = $this->postJson('/api/v1/dish-extra-options', []);

        $response->assertStatus(422)->assertJsonValidationErrors(['dish_extra_group_id', 'name']);
    }

    #[Test]
    public function it_rejects_a_soft_deleted_extra_group_on_create()
    {
        $group = $this->createExtraGroup();
        $group->delete();

        $response = $this->postJson('/api/v1/dish-extra-options', [
            'dish_extra_group_id' => $group->public_id,
            'name' => 'Salsa picante',
        ]);

        $response->assertStatus(422)->assertJsonValidationErrors(['dish_extra_group_id']);
    }

    #[Test]
    public function it_can_update_extra_option()
    {
        $option = $this->createExtraOption(null, ['name' => 'Old', 'price_delta' => 0]);

        $response = $this->putJson("/api/v1/dish-extra-options/{$option->public_id}", [
            'name' => 'New',
            'price_delta' => 15.50,
        ]);

        $response->assertStatus(200)->assertJsonFragment(['name' => 'New', 'price_delta' => 15.5]);
    }

    #[Test]
    public function it_can_delete_extra_option()
    {
        $option = $this->createExtraOption();

        $response = $this->deleteJson("/api/v1/dish-extra-options/{$option->public_id}");

        $response->assertStatus(204);
        $this->assertSoftDeleted('dish_extra_options', ['id' => $option->id]);
    }

    #[Test]
    public function it_rejects_requests_without_dishes_delete_permission()
    {
        $option = $this->createExtraOption();
        $this->user->removeRole('admin');

        $response = $this->deleteJson("/api/v1/dish-extra-options/{$option->public_id}");

        $response->assertStatus(403);
    }
}
