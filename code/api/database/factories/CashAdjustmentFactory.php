<?php

namespace Database\Factories;

use App\Models\CashAdjustment;
use App\Models\CashSession;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\CashAdjustment>
 */
class CashAdjustmentFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $sources = ['POS', 'UBER_EATS', 'RAPPI', 'DIDI_FOOD', 'MANUAL'];
        $isPosted = $this->faker->boolean(30);

        return [
            'cash_session_id' => CashSession::factory(),
            'source_system' => $this->faker->randomElement($sources),
            'type' => CashAdjustment::TYPE_EXTERNAL_IMPORT,
            'direction' => CashAdjustment::DIRECTION_INFLOW,
            'notes' => $this->faker->optional()->sentence(),
            'posted_by' => $isPosted ? User::factory() : null,
            'posted_at' => $isPosted ? $this->faker->dateTimeBetween('-1 week', 'now') : null,
            'meta' => [
                'import_date' => $this->faker->dateTime()->format('Y-m-d H:i:s'),
                'batch_id' => $this->faker->optional()->uuid(),
            ],
        ];
    }

    /**
     * Indicate that the adjustment is an inflow.
     */
    public function inflow(): static
    {
        return $this->state(fn (array $attributes) => [
            'direction' => CashAdjustment::DIRECTION_INFLOW,
        ]);
    }

    /**
     * Indicate that the adjustment is an outflow.
     */
    public function outflow(): static
    {
        return $this->state(fn (array $attributes) => [
            'direction' => CashAdjustment::DIRECTION_OUTFLOW,
        ]);
    }

    /**
     * Indicate that the adjustment is an external import.
     */
    public function externalImport(): static
    {
        return $this->state(fn (array $attributes) => [
            'type' => CashAdjustment::TYPE_EXTERNAL_IMPORT,
            'source_system' => $this->faker->randomElement(['POS', 'UBER_EATS', 'RAPPI', 'DIDI_FOOD']),
        ]);
    }

    /**
     * Indicate that the adjustment is a correction.
     */
    public function correction(): static
    {
        return $this->state(fn (array $attributes) => [
            'type' => CashAdjustment::TYPE_CORRECTION,
            'source_system' => 'MANUAL',
            'notes' => 'Corrección manual: '.$this->faker->sentence(),
        ]);
    }

    /**
     * Indicate that the adjustment is posted.
     */
    public function posted(): static
    {
        return $this->state(fn (array $attributes) => [
            'posted_by' => User::factory(),
            'posted_at' => now(),
        ]);
    }

    /**
     * Indicate that the adjustment is draft.
     */
    public function draft(): static
    {
        return $this->state(fn (array $attributes) => [
            'posted_by' => null,
            'posted_at' => null,
        ]);
    }
}
