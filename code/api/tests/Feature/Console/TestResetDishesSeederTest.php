<?php

namespace Tests\Feature\Console;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class TestResetDishesSeederTest extends TestCase
{
    use RefreshDatabase;

    #[Test]
    public function list_option_shows_dishes_and_fakes_dishes_groups(): void
    {
        // "fakes-dishes" must be asserted before the shorter "dishes" substring —
        // expectsOutputToContain expectations are unbounded, so a shorter substring
        // registered first will also swallow later lines that merely contain it
        // (e.g. "dishes" matching the "fakes-dishes" line) and starve the later one.
        $this->artisan('test:reset', ['--list' => true])
            ->expectsOutputToContain('fakes-dishes')
            ->expectsOutputToContain('dishes')
            ->expectsOutputToContain('DishesTestSeeder')
            ->expectsOutputToContain('FakeDishesSeeder')
            ->assertExitCode(0);
    }

    #[Test]
    public function dishes_group_seeds_deterministic_categories(): void
    {
        $this->artisan('test:reset', ['--seeders' => 'dishes'])
            ->expectsOutputToContain('DishesTestSeeder')
            ->assertExitCode(0);

        $this->assertDatabaseHas('dish_categories', ['name' => 'Rollos']);
        $this->assertDatabaseHas('dish_categories', ['name' => 'Ramen']);
    }

    #[Test]
    public function dishes_group_seeds_a_dish_with_no_extras(): void
    {
        $this->artisan('test:reset', ['--seeders' => 'dishes'])->assertExitCode(0);

        $this->assertDatabaseHas('dishes', ['name' => 'California Roll', 'base_price' => 120.00]);

        $dishId = DB::table('dishes')->where('name', 'California Roll')->value('id');
        $this->assertSame(0, DB::table('dish_extra_groups')->where('dish_id', $dishId)->count());
    }

    #[Test]
    public function dishes_group_seeds_a_dish_with_a_single_required_extra_group(): void
    {
        $this->artisan('test:reset', ['--seeders' => 'dishes'])->assertExitCode(0);

        $this->assertDatabaseHas('dishes', ['name' => 'Tonkotsu Ramen', 'base_price' => 145.00]);

        $dishId = DB::table('dishes')->where('name', 'Tonkotsu Ramen')->value('id');
        $this->assertDatabaseHas('dish_extra_groups', [
            'dish_id' => $dishId,
            'name' => 'Nivel de picor',
            'is_required' => true,
            'selection_type' => 'SINGLE',
        ]);

        $groupId = DB::table('dish_extra_groups')->where('dish_id', $dishId)->value('id');
        $this->assertSame(3, DB::table('dish_extra_options')->where('dish_extra_group_id', $groupId)->count());
    }

    #[Test]
    public function dishes_group_seeds_a_dish_with_a_multiple_optional_extra_group(): void
    {
        $this->artisan('test:reset', ['--seeders' => 'dishes'])->assertExitCode(0);

        $this->assertDatabaseHas('dishes', ['name' => 'Spicy Tuna Roll', 'base_price' => 135.00]);

        $dishId = DB::table('dishes')->where('name', 'Spicy Tuna Roll')->value('id');
        $this->assertDatabaseHas('dish_extra_groups', [
            'dish_id' => $dishId,
            'name' => 'Salsa extra',
            'is_required' => false,
            'selection_type' => 'MULTIPLE',
        ]);

        $groupId = DB::table('dish_extra_groups')->where('dish_id', $dishId)->value('id');
        $this->assertGreaterThanOrEqual(2, DB::table('dish_extra_options')->where('dish_extra_group_id', $groupId)->count());
        $this->assertDatabaseHas('dish_extra_options', [
            'dish_extra_group_id' => $groupId,
            'price_delta' => 15.00,
        ]);
    }

    #[Test]
    public function fakes_dishes_group_creates_volume_data_for_pagination_testing(): void
    {
        $this->artisan('test:reset', ['--seeders' => 'fakes-dishes'])
            ->expectsOutputToContain('FakeDishesSeeder')
            ->assertExitCode(0);

        $categoryCount = config('seeders.factory_counts.dish_categories', 5);
        $dishesPerCategory = config('seeders.factory_counts.dishes_per_category', 8);

        // fakes-dishes runs DishesTestSeeder first (2 deterministic categories) then
        // FakeDishesSeeder adds $categoryCount more via factories.
        $this->assertSame(2 + $categoryCount, DB::table('dish_categories')->count());
        $this->assertGreaterThanOrEqual($categoryCount * $dishesPerCategory, DB::table('dishes')->count());
    }
}
