<?php

namespace Tests\Feature\Dishes;

use App\Models\Dish;
use App\Models\DishCategory;
use App\Models\DishExtraGroup;
use App\Models\DishExtraOption;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Passport\Passport;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

abstract class DishesTestCase extends TestCase
{
    use RefreshDatabase;

    protected User $user;

    protected function setUp(): void
    {
        parent::setUp();

        $dishesPermissions = ['dishes.view', 'dishes.create', 'dishes.update', 'dishes.delete', 'dishes.manage-media'];

        foreach ($dishesPermissions as $name) {
            Permission::firstOrCreate(['name' => $name, 'guard_name' => 'api']);
        }

        $adminRole = Role::firstOrCreate(['name' => 'admin', 'guard_name' => 'api']);
        $adminRole->givePermissionTo($dishesPermissions);

        $this->user = User::factory()->create([
            'first_name' => 'Test',
            'last_name' => 'Admin',
            'email' => 'test-admin@sushigo.com',
        ]);

        $this->user->assignRole('admin');

        Passport::actingAs($this->user);
    }

    protected function createCategory(array $attributes = []): DishCategory
    {
        return DishCategory::create(array_merge([
            'name' => 'Rollos',
            'position' => 0,
            'is_active' => true,
        ], $attributes));
    }

    protected function createDish(?DishCategory $category = null, array $attributes = []): Dish
    {
        return Dish::create(array_merge([
            'dish_category_id' => ($category ?? $this->createCategory())->id,
            'name' => 'Test Dish',
            'description' => 'A tasty test dish',
            'base_price' => 100.00,
            'is_active' => true,
            'position' => 0,
        ], $attributes));
    }

    protected function createExtraGroup(?Dish $dish = null, array $attributes = []): DishExtraGroup
    {
        return DishExtraGroup::create(array_merge([
            'dish_id' => ($dish ?? $this->createDish())->id,
            'name' => 'Elige tu salsa',
            'is_required' => false,
            'selection_type' => DishExtraGroup::SELECTION_SINGLE,
        ], $attributes));
    }

    protected function createExtraOption(?DishExtraGroup $group = null, array $attributes = []): DishExtraOption
    {
        return DishExtraOption::create(array_merge([
            'dish_extra_group_id' => ($group ?? $this->createExtraGroup())->id,
            'name' => 'Salsa de soya',
            'price_delta' => 0,
            'is_active' => true,
            'position' => 0,
        ], $attributes));
    }
}
