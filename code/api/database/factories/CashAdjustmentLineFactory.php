<?php

namespace Database\Factories;

use App\Models\BankAccount;
use App\Models\CashAdjustment;
use App\Models\CashAdjustmentLine;
use App\Models\CashTerminal;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\CashAdjustmentLine>
 */
class CashAdjustmentLineFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $tenderType = $this->faker->randomElement([
            CashAdjustmentLine::TENDER_CASH,
            CashAdjustmentLine::TENDER_CARD,
            CashAdjustmentLine::TENDER_TRANSFER,
        ]);

        $cardTerminalId = null;
        $bankAccountId = null;

        if ($tenderType === CashAdjustmentLine::TENDER_CARD) {
            $cardTerminalId = CashTerminal::factory();
        } elseif ($tenderType === CashAdjustmentLine::TENDER_TRANSFER) {
            $bankAccountId = BankAccount::factory();
        }

        return [
            'cash_adjustment_id' => CashAdjustment::factory(),
            'tender_type' => $tenderType,
            'amount' => $this->faker->randomFloat(2, 10, 5000),
            'currency' => 'MXN',
            'card_terminal_id' => $cardTerminalId,
            'bank_account_id' => $bankAccountId,
            'reference' => $this->faker->optional()->bothify('REF-####????'),
            'meta' => [
                'transaction_id' => $this->faker->optional()->uuid(),
                'authorization_code' => $this->faker->optional()->numerify('AUTH-######'),
            ],
        ];
    }

    /**
     * Indicate that the line is cash tender.
     */
    public function cash(): static
    {
        return $this->state(fn (array $attributes) => [
            'tender_type' => CashAdjustmentLine::TENDER_CASH,
            'card_terminal_id' => null,
            'bank_account_id' => null,
        ]);
    }

    /**
     * Indicate that the line is card tender.
     */
    public function card(): static
    {
        return $this->state(fn (array $attributes) => [
            'tender_type' => CashAdjustmentLine::TENDER_CARD,
            'card_terminal_id' => CashTerminal::factory(),
            'bank_account_id' => null,
        ]);
    }

    /**
     * Indicate that the line is transfer tender.
     */
    public function transfer(): static
    {
        return $this->state(fn (array $attributes) => [
            'tender_type' => CashAdjustmentLine::TENDER_TRANSFER,
            'card_terminal_id' => null,
            'bank_account_id' => BankAccount::factory(),
        ]);
    }

    /**
     * Set a specific amount.
     */
    public function withAmount(float $amount): static
    {
        return $this->state(fn (array $attributes) => [
            'amount' => $amount,
        ]);
    }
}
