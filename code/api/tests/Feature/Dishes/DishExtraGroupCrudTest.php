<?php

namespace Tests\Feature\Dishes;

use App\Models\DishExtraGroup;
use Illuminate\Support\Facades\DB;
use PHPUnit\Framework\Attributes\Test;

class DishExtraGroupCrudTest extends DishesTestCase
{
    #[Test]
    public function it_can_list_extra_groups_filtered_by_dish()
    {
        $dish = $this->createDish();
        $this->createExtraGroup($dish, ['name' => 'Elige tu salsa']);
        $this->createExtraGroup($this->createDish(), ['name' => 'Otro grupo']);

        $response = $this->getJson("/api/v1/dish-extra-groups?dish_id={$dish->public_id}");

        $response->assertStatus(200);
        $this->assertCount(1, $response->json('data'));
    }

    #[Test]
    public function it_does_not_n_plus_one_query_options_when_listing()
    {
        $group = $this->createExtraGroup();
        $this->createExtraOption($group);

        // Warm up permission/route-binding caches with a throwaway request so
        // both measurements below reflect only the data-driven query count.
        $this->getJson('/api/v1/dish-extra-groups')->assertStatus(200);

        DB::enableQueryLog();
        DB::flushQueryLog();
        $this->getJson('/api/v1/dish-extra-groups')->assertStatus(200);
        $queryCountSmall = count(DB::getQueryLog());
        DB::disableQueryLog();

        for ($i = 0; $i < 4; $i++) {
            $otherGroup = $this->createExtraGroup(null, ['name' => "Group {$i}"]);
            $this->createExtraOption($otherGroup);
            $this->createExtraOption($otherGroup);
        }

        DB::enableQueryLog();
        DB::flushQueryLog();
        $this->getJson('/api/v1/dish-extra-groups')->assertStatus(200);
        $queryCountLarge = count(DB::getQueryLog());
        DB::disableQueryLog();

        // Without eager-loading options.extraGroup, each option's resource
        // re-queries its parent group, so query count scales with the number
        // of groups/options instead of staying flat.
        $this->assertSame($queryCountSmall, $queryCountLarge);
    }

    #[Test]
    public function it_can_show_extra_group_with_options()
    {
        $group = $this->createExtraGroup();
        $this->createExtraOption($group, ['name' => 'Soya']);

        $response = $this->getJson("/api/v1/dish-extra-groups/{$group->public_id}");

        $response->assertStatus(200)->assertJsonPath('data.options.0.name', 'Soya');
    }

    #[Test]
    public function it_excludes_inactive_options_from_the_nested_group_payload()
    {
        $group = $this->createExtraGroup();
        $this->createExtraOption($group, ['name' => 'Soya', 'is_active' => true]);
        $this->createExtraOption($group, ['name' => 'Discontinuada', 'is_active' => false]);

        $response = $this->getJson("/api/v1/dish-extra-groups/{$group->public_id}");

        $response->assertStatus(200);
        $names = array_column($response->json('data.options'), 'name');
        $this->assertSame(['Soya'], $names);
    }

    #[Test]
    public function it_can_create_extra_group()
    {
        $dish = $this->createDish();

        $response = $this->postJson('/api/v1/dish-extra-groups', [
            'dish_id' => $dish->public_id,
            'name' => 'Elige tu salsa',
            'selection_type' => 'single',
            'is_required' => true,
        ]);

        $response->assertStatus(201)
            ->assertJsonFragment(['name' => 'Elige tu salsa', 'selection_type' => 'SINGLE', 'is_required' => true])
            ->assertJsonPath('data.options', []);

        $this->assertDatabaseHas('dish_extra_groups', [
            'dish_id' => $dish->id,
            'selection_type' => DishExtraGroup::SELECTION_SINGLE,
        ]);
    }

    #[Test]
    public function it_rejects_a_soft_deleted_dish_on_create()
    {
        $dish = $this->createDish();
        $dish->delete();

        $response = $this->postJson('/api/v1/dish-extra-groups', [
            'dish_id' => $dish->public_id,
            'name' => 'Elige tu salsa',
            'selection_type' => 'SINGLE',
        ]);

        $response->assertStatus(422)->assertJsonValidationErrors(['dish_id']);
    }

    #[Test]
    public function it_validates_selection_type_on_create()
    {
        $dish = $this->createDish();

        $response = $this->postJson('/api/v1/dish-extra-groups', [
            'dish_id' => $dish->public_id,
            'name' => 'Elige tu salsa',
            'selection_type' => 'INVALID',
        ]);

        $response->assertStatus(422)->assertJsonValidationErrors(['selection_type']);
    }

    #[Test]
    public function it_can_update_extra_group()
    {
        $group = $this->createExtraGroup(null, ['selection_type' => DishExtraGroup::SELECTION_SINGLE]);

        $response = $this->putJson("/api/v1/dish-extra-groups/{$group->public_id}", [
            'selection_type' => 'MULTIPLE',
        ]);

        $response->assertStatus(200)->assertJsonFragment(['selection_type' => 'MULTIPLE']);
    }

    #[Test]
    public function it_can_delete_extra_group()
    {
        $group = $this->createExtraGroup();

        $response = $this->deleteJson("/api/v1/dish-extra-groups/{$group->public_id}");

        $response->assertStatus(204);
        $this->assertSoftDeleted('dish_extra_groups', ['id' => $group->id]);
    }

    #[Test]
    public function it_cascades_soft_delete_to_options()
    {
        $group = $this->createExtraGroup();
        $option = $this->createExtraOption($group);

        $response = $this->deleteJson("/api/v1/dish-extra-groups/{$group->public_id}");

        $response->assertStatus(204);
        $this->assertSoftDeleted('dish_extra_options', ['id' => $option->id]);
    }

    #[Test]
    public function it_rejects_requests_without_dishes_create_permission()
    {
        $dish = $this->createDish();
        $this->user->removeRole('admin');

        $response = $this->postJson('/api/v1/dish-extra-groups', [
            'dish_id' => $dish->public_id,
            'name' => 'Elige tu salsa',
            'selection_type' => 'SINGLE',
        ]);

        $response->assertStatus(403);
    }
}
