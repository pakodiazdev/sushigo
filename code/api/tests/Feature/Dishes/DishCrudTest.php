<?php

namespace Tests\Feature\Dishes;

use Illuminate\Support\Facades\DB;
use PHPUnit\Framework\Attributes\Test;

class DishCrudTest extends DishesTestCase
{
    #[Test]
    public function it_can_list_dishes()
    {
        $category = $this->createCategory();
        $this->createDish($category, ['name' => 'California Roll']);
        $this->createDish($category, ['name' => 'Ramen Tonkotsu']);

        $response = $this->getJson('/api/v1/dishes');

        $response->assertStatus(200)
            ->assertJsonStructure([
                'data' => [
                    '*' => ['id', 'dish_category_id', 'name', 'base_price', 'is_active', 'position', 'extra_groups'],
                ],
            ]);

        $this->assertCount(2, $response->json('data'));
    }

    #[Test]
    public function it_does_not_n_plus_one_query_extra_groups_and_options_when_listing()
    {
        $category = $this->createCategory();
        $dish = $this->createDish($category);
        $group = $this->createExtraGroup($dish);
        $this->createExtraOption($group);

        // Warm up permission/route-binding caches with a throwaway request so
        // both measurements below reflect only the data-driven query count.
        $this->getJson('/api/v1/dishes')->assertStatus(200);

        DB::enableQueryLog();
        DB::flushQueryLog();
        $this->getJson('/api/v1/dishes')->assertStatus(200);
        $queryCountSmall = count(DB::getQueryLog());
        DB::disableQueryLog();

        for ($i = 0; $i < 4; $i++) {
            $otherDish = $this->createDish($category, ['name' => "Dish {$i}"]);
            $otherGroup = $this->createExtraGroup($otherDish);
            $this->createExtraOption($otherGroup);
            $this->createExtraOption($otherGroup);
        }

        DB::enableQueryLog();
        DB::flushQueryLog();
        $this->getJson('/api/v1/dishes')->assertStatus(200);
        $queryCountLarge = count(DB::getQueryLog());
        DB::disableQueryLog();

        // Without eager-loading the inverse relations the nested resources
        // dereference (extraGroups.dish, extraGroups.options.extraGroup), query
        // count scales with the number of extra groups/options instead of
        // staying flat.
        $this->assertSame($queryCountSmall, $queryCountLarge);
    }

    #[Test]
    public function it_groups_unfiltered_list_by_category_before_ordering_by_position()
    {
        // categoryB is created first but configured to display second
        // (position 1); categoryA is created second but configured to display
        // first (position 0). Grouping by the category's internal id/creation
        // order instead of dish_categories.position would list B before A.
        $categoryB = $this->createCategory(['name' => 'Ramen', 'position' => 1]);
        $categoryA = $this->createCategory(['name' => 'Rollos', 'position' => 0]);
        // Create dishes out of category order too, with clashing position
        // values across categories, to prove sorting doesn't just interleave
        // on dish position alone.
        $this->createDish($categoryB, ['name' => 'B0', 'position' => 0]);
        $this->createDish($categoryA, ['name' => 'A1', 'position' => 1]);
        $this->createDish($categoryA, ['name' => 'A0', 'position' => 0]);
        $this->createDish($categoryB, ['name' => 'B1', 'position' => 1]);

        $response = $this->getJson('/api/v1/dishes');

        $response->assertStatus(200);
        $names = array_column($response->json('data'), 'name');
        $this->assertSame(['A0', 'A1', 'B0', 'B1'], $names);
    }

    #[Test]
    public function it_can_filter_dishes_by_category()
    {
        $categoryA = $this->createCategory(['name' => 'Rollos']);
        $categoryB = $this->createCategory(['name' => 'Ramen']);
        $this->createDish($categoryA);
        $this->createDish($categoryB);

        $response = $this->getJson("/api/v1/dishes?dish_category_id={$categoryA->public_id}");

        $response->assertStatus(200);
        $this->assertCount(1, $response->json('data'));
    }

    #[Test]
    public function it_can_search_dishes_by_name()
    {
        $this->createDish(null, ['name' => 'California Roll']);
        $this->createDish(null, ['name' => 'Spicy Tuna Roll']);
        $this->createDish(null, ['name' => 'Ramen Tonkotsu']);

        $response = $this->getJson('/api/v1/dishes?search=roll');

        $response->assertStatus(200);
        $this->assertCount(2, $response->json('data'));
    }

    #[Test]
    public function it_can_show_dish_with_extra_groups_and_options()
    {
        $dish = $this->createDish();
        $group = $this->createExtraGroup($dish, ['name' => 'Elige tu salsa']);
        $this->createExtraOption($group, ['name' => 'Soya']);

        $response = $this->getJson("/api/v1/dishes/{$dish->public_id}");

        $response->assertStatus(200)
            ->assertJsonPath('data.id', $dish->public_id)
            ->assertJsonPath('data.extra_groups.0.name', 'Elige tu salsa')
            ->assertJsonPath('data.extra_groups.0.options.0.name', 'Soya');
    }

    #[Test]
    public function it_excludes_inactive_options_from_the_nested_dish_payload()
    {
        // totalPriceFor() already ignores inactive options — the nested payload
        // must agree, or a client rendering straight from GET /dishes/{id} would
        // offer an extra that contributes nothing to the computed total.
        $dish = $this->createDish();
        $group = $this->createExtraGroup($dish, ['name' => 'Elige tu salsa']);
        $this->createExtraOption($group, ['name' => 'Soya', 'is_active' => true]);
        $this->createExtraOption($group, ['name' => 'Discontinuada', 'is_active' => false]);

        $response = $this->getJson("/api/v1/dishes/{$dish->public_id}");

        $response->assertStatus(200);
        $names = array_column($response->json('data.extra_groups.0.options'), 'name');
        $this->assertSame(['Soya'], $names);
    }

    #[Test]
    public function it_can_create_dish()
    {
        $category = $this->createCategory();

        $response = $this->postJson('/api/v1/dishes', [
            'dish_category_id' => $category->public_id,
            'name' => 'California Roll',
            'description' => 'Kanikama, aguacate, pepino',
            'base_price' => 120.00,
        ]);

        $response->assertStatus(201)
            ->assertJsonFragment(['name' => 'California Roll', 'base_price' => 120.0])
            ->assertJsonPath('data.extra_groups', []);

        $this->assertDatabaseHas('dishes', [
            'dish_category_id' => $category->id,
            'name' => 'California Roll',
        ]);
    }

    #[Test]
    public function it_validates_dish_category_exists_on_create()
    {
        $response = $this->postJson('/api/v1/dishes', [
            'dish_category_id' => '01JNONEXISTENTCATEGORY0000',
            'name' => 'Ghost Roll',
            'base_price' => 50,
        ]);

        $response->assertStatus(422)->assertJsonValidationErrors(['dish_category_id']);
    }

    #[Test]
    public function it_rejects_a_soft_deleted_dish_category_on_create()
    {
        $category = $this->createCategory();
        $category->delete();

        $response = $this->postJson('/api/v1/dishes', [
            'dish_category_id' => $category->public_id,
            'name' => 'Orphan Roll',
            'base_price' => 50,
        ]);

        $response->assertStatus(422)->assertJsonValidationErrors(['dish_category_id']);
    }

    #[Test]
    public function it_can_update_dish()
    {
        $dish = $this->createDish(null, ['name' => 'Old Roll', 'base_price' => 100]);

        $response = $this->putJson("/api/v1/dishes/{$dish->public_id}", [
            'name' => 'New Roll',
            'base_price' => 150.00,
        ]);

        $response->assertStatus(200)->assertJsonFragment(['name' => 'New Roll', 'base_price' => 150.0]);
        $this->assertDatabaseHas('dishes', ['id' => $dish->id, 'name' => 'New Roll']);
    }

    #[Test]
    public function it_can_delete_dish()
    {
        $dish = $this->createDish();

        $response = $this->deleteJson("/api/v1/dishes/{$dish->public_id}");

        $response->assertStatus(204);
        $this->assertSoftDeleted('dishes', ['id' => $dish->id]);
    }

    #[Test]
    public function it_cascades_soft_delete_to_extra_groups_and_options()
    {
        $dish = $this->createDish();
        $group = $this->createExtraGroup($dish);
        $option = $this->createExtraOption($group);

        $response = $this->deleteJson("/api/v1/dishes/{$dish->public_id}");

        $response->assertStatus(204);
        $this->assertSoftDeleted('dish_extra_groups', ['id' => $group->id]);
        $this->assertSoftDeleted('dish_extra_options', ['id' => $option->id]);
    }

    #[Test]
    public function it_rejects_requests_without_dishes_view_permission()
    {
        $this->user->removeRole('admin');
        $dish = $this->createDish();

        $response = $this->getJson("/api/v1/dishes/{$dish->public_id}");

        $response->assertStatus(403);
    }

    #[Test]
    public function it_rejects_update_without_dishes_update_permission()
    {
        $dish = $this->createDish();
        $this->user->removeRole('admin');

        $response = $this->putJson("/api/v1/dishes/{$dish->public_id}", ['name' => 'Hacked']);

        $response->assertStatus(403);
    }
}
