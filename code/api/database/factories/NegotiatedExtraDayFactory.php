<?php

namespace Database\Factories;

use App\Models\Branch;
use App\Models\Employee;
use App\Models\NegotiatedExtraDay;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/** @extends Factory<NegotiatedExtraDay> */
class NegotiatedExtraDayFactory extends Factory
{
    protected $model = NegotiatedExtraDay::class;

    public function definition(): array
    {
        $wage = $this->faker->randomFloat(2, 200, 1000);
        $primaPct = $this->faker->randomElement([0, 25, 50, 100]);
        $primaAmount = round($wage * $primaPct / 100, 4);

        return [
            'employee_id' => Employee::factory(),
            'branch_id' => Branch::factory(),
            'date' => $this->faker->unique()->dateTimeBetween('-6 months', 'now')->format('Y-m-d'),
            'agreed_daily_wage' => $wage,
            'prima_percent' => $primaPct,
            'prima_amount' => $primaAmount,
            'approved_by' => User::factory(),
            'status' => NegotiatedExtraDay::STATUS_APPROVED,
            'notes' => null,
        ];
    }
}
