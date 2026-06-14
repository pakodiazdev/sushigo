<?php

namespace Database\Factories;

use App\Models\Holiday;
use Illuminate\Database\Eloquent\Factories\Factory;

/** @extends Factory<Holiday> */
class HolidayFactory extends Factory
{
    protected $model = Holiday::class;

    public function definition(): array
    {
        return [
            'date' => $this->faker->unique()->dateTimeBetween('2026-01-01', '2026-12-31')->format('Y-m-d'),
            'name' => $this->faker->words(3, true),
            'pay_multiplier' => $this->faker->randomElement([2.00, 3.00]),
        ];
    }
}
