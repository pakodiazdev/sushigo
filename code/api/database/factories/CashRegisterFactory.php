<?php

namespace Database\Factories;

use Illuminate\Database\Eloquent\Factories\Factory;
use App\Models\Branch;
use App\Models\OperatingUnit;
use App\Models\CashRegister;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\CashRegister>
 */
class CashRegisterFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $types = [CashRegister::TYPE_ON_PREMISE, CashRegister::TYPE_DELIVERY, CashRegister::TYPE_EVENT];
        $type = $this->faker->randomElement($types);

        return [
            'branch_id' => Branch::factory(),
            'operating_unit_id' => null,
            'code' => 'REG-' . strtoupper($this->faker->unique()->bothify('???###')),
            'name' => $this->faker->randomElement([
                'Caja Principal',
                'Caja Express',
                'Caja Delivery',
                'Caja Eventos',
                'Caja Barra'
            ]),
            'type' => $type,
            'is_active' => true,
            'meta' => [
                'location' => $this->faker->randomElement(['Entrada', 'Salón', 'Barra', 'Terraza']),
                'max_cash_limit' => $this->faker->randomElement([5000, 10000, 15000, 20000]),
            ],
        ];
    }

    /**
     * Indicate that the register is inactive.
     */
    public function inactive(): static
    {
        return $this->state(fn(array $attributes) => [
            'is_active' => false,
        ]);
    }

    /**
     * Indicate that the register is for on-premise.
     */
    public function onPremise(): static
    {
        return $this->state(fn(array $attributes) => [
            'type' => CashRegister::TYPE_ON_PREMISE,
            'name' => 'Caja ' . $this->faker->randomElement(['Principal', 'Secundaria', 'Express']),
        ]);
    }

    /**
     * Indicate that the register is for delivery.
     */
    public function delivery(): static
    {
        return $this->state(fn(array $attributes) => [
            'type' => CashRegister::TYPE_DELIVERY,
            'name' => 'Caja Delivery',
        ]);
    }

    /**
     * Indicate that the register is for events.
     */
    public function event(): static
    {
        return $this->state(fn(array $attributes) => [
            'type' => CashRegister::TYPE_EVENT,
            'name' => 'Caja Eventos',
        ]);
    }
}
