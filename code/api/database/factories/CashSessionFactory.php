<?php

namespace Database\Factories;

use App\Models\CashRegister;
use App\Models\CashSession;
use Carbon\Carbon;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\CashSession>
 */
class CashSessionFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $openingBalance = $this->faker->randomFloat(2, 500, 5000);

        return [
            'cash_register_id' => CashRegister::factory(),
            'operating_date' => Carbon::today(),
            'status' => CashSession::STATUS_DRAFT,
            'opening_balance' => $openingBalance,
            'closing_balance' => $openingBalance,
            'meta' => [
                'opened_by' => $this->faker->name(),
                'shift' => $this->faker->randomElement(['morning', 'afternoon', 'evening']),
            ],
        ];
    }

    /**
     * Indicate that the session is posted.
     */
    public function posted(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => CashSession::STATUS_POSTED,
            'closing_balance' => $this->faker->randomFloat(2, 1000, 10000),
        ]);
    }

    /**
     * Indicate that the session is draft.
     */
    public function draft(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => CashSession::STATUS_DRAFT,
        ]);
    }

    /**
     * Set a specific operating date.
     */
    public function forDate(string $date): static
    {
        return $this->state(fn (array $attributes) => [
            'operating_date' => $date,
        ]);
    }

    /**
     * Set a specific opening balance.
     */
    public function withOpeningBalance(float $amount): static
    {
        return $this->state(fn (array $attributes) => [
            'opening_balance' => $amount,
            'closing_balance' => $amount,
        ]);
    }
}
