<?php

namespace Database\Factories;

use Illuminate\Database\Eloquent\Factories\Factory;
use App\Models\Branch;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\CashTerminal>
 */
class CashTerminalFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $providers = ['CLIP', 'MERCADOPAGO', 'STRIPE', 'OPENPAY', 'CONEKTA'];
        $provider = $this->faker->randomElement($providers);

        return [
            'branch_id' => Branch::factory(),
            'name' => $provider . ' - ' . $this->faker->randomElement(['Terminal 1', 'Terminal 2', 'Móvil']),
            'provider' => $provider,
            'account_ref' => $this->faker->bothify('ACC-########'),
            'last_four' => $this->faker->numerify('####'),
            'is_active' => true,
            'meta' => [
                'device_id' => $this->faker->uuid(),
                'serial_number' => $this->faker->optional()->bothify('SN-########'),
                'commission_rate' => $this->faker->randomFloat(2, 2.5, 4.5),
            ],
        ];
    }

    /**
     * Indicate that the terminal is inactive.
     */
    public function inactive(): static
    {
        return $this->state(fn(array $attributes) => [
            'is_active' => false,
        ]);
    }

    /**
     * Set a specific provider.
     */
    public function provider(string $provider): static
    {
        return $this->state(fn(array $attributes) => [
            'provider' => $provider,
            'name' => $provider . ' - Terminal',
        ]);
    }
}
