<?php

namespace Tests\Unit\Models;

use App\Models\Dish;
use App\Models\DishCategory;
use App\Models\DishExtraGroup;
use App\Models\DishExtraOption;
use Illuminate\Foundation\Testing\RefreshDatabase;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class DishTotalPriceForTest extends TestCase
{
    use RefreshDatabase;

    private function makeDish(float $basePrice = 100.00): Dish
    {
        $category = DishCategory::create(['name' => 'Rollos', 'position' => 0, 'is_active' => true]);

        return Dish::create([
            'dish_category_id' => $category->id,
            'name' => 'California Roll',
            'base_price' => $basePrice,
            'is_active' => true,
            'position' => 0,
        ]);
    }

    #[Test]
    public function it_returns_base_price_when_no_options_selected()
    {
        $dish = $this->makeDish(100.00);

        $this->assertSame(100.00, $dish->totalPriceFor([]));
    }

    #[Test]
    public function it_adds_a_single_selected_options_price_delta()
    {
        $dish = $this->makeDish(100.00);
        $group = DishExtraGroup::create([
            'dish_id' => $dish->id,
            'name' => 'Elige tu salsa',
            'is_required' => false,
            'selection_type' => DishExtraGroup::SELECTION_SINGLE,
        ]);
        $option = DishExtraOption::create([
            'dish_extra_group_id' => $group->id,
            'name' => 'Salsa picante',
            'price_delta' => 15.50,
            'is_active' => true,
            'position' => 0,
        ]);

        $this->assertSame(115.50, $dish->totalPriceFor([$option->id]));
    }

    #[Test]
    public function it_sums_multiple_selected_options_price_deltas()
    {
        $dish = $this->makeDish(100.00);
        $group = DishExtraGroup::create([
            'dish_id' => $dish->id,
            'name' => 'Extras',
            'is_required' => false,
            'selection_type' => DishExtraGroup::SELECTION_MULTIPLE,
        ]);
        $optionA = DishExtraOption::create([
            'dish_extra_group_id' => $group->id,
            'name' => 'Extra queso',
            'price_delta' => 10.00,
            'is_active' => true,
            'position' => 0,
        ]);
        $optionB = DishExtraOption::create([
            'dish_extra_group_id' => $group->id,
            'name' => 'Extra aguacate',
            'price_delta' => 12.75,
            'is_active' => true,
            'position' => 1,
        ]);

        $this->assertSame(122.75, $dish->totalPriceFor([$optionA->id, $optionB->id]));
    }

    #[Test]
    public function it_ignores_option_ids_belonging_to_another_dish()
    {
        $dish = $this->makeDish(100.00);
        $otherDish = $this->makeDish(50.00);
        $otherGroup = DishExtraGroup::create([
            'dish_id' => $otherDish->id,
            'name' => 'Extras de otro platillo',
            'is_required' => false,
            'selection_type' => DishExtraGroup::SELECTION_SINGLE,
        ]);
        $foreignOption = DishExtraOption::create([
            'dish_extra_group_id' => $otherGroup->id,
            'name' => 'No deberia aplicar',
            'price_delta' => 999.00,
            'is_active' => true,
            'position' => 0,
        ]);

        $this->assertSame(100.00, $dish->totalPriceFor([$foreignOption->id]));
    }

    #[Test]
    public function it_ignores_inactive_options()
    {
        $dish = $this->makeDish(100.00);
        $group = DishExtraGroup::create([
            'dish_id' => $dish->id,
            'name' => 'Extras',
            'is_required' => false,
            'selection_type' => DishExtraGroup::SELECTION_SINGLE,
        ]);
        $inactiveOption = DishExtraOption::create([
            'dish_extra_group_id' => $group->id,
            'name' => 'Descontinuado',
            'price_delta' => 20.00,
            'is_active' => false,
            'position' => 0,
        ]);

        $this->assertSame(100.00, $dish->totalPriceFor([$inactiveOption->id]));
    }
}
