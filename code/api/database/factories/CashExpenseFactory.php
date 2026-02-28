<?php

namespace Database\Factories;

use App\Models\BankAccount;
use App\Models\CashExpense;
use App\Models\CashSession;
use App\Models\CashTerminal;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\CashExpense>
 */
class CashExpenseFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $categories = [
            'SUPPLIES',
            'MAINTENANCE',
            'UTILITIES',
            'DELIVERY_FEES',
            'TIPS',
            'PETTY_CASH',
            'OTHER',
        ];

        $vendors = [
            'Proveedor Local',
            'Ferretería del Centro',
            'Papelería Express',
            'Transportes Rápidos',
            'Varios',
        ];

        $tenderType = $this->faker->randomElement([
            CashExpense::TENDER_CASH,
            CashExpense::TENDER_CARD,
            CashExpense::TENDER_TRANSFER,
        ]);

        $cardTerminalId = null;
        $bankAccountId = null;

        if ($tenderType === CashExpense::TENDER_CARD) {
            $cardTerminalId = CashTerminal::factory();
        } elseif ($tenderType === CashExpense::TENDER_TRANSFER) {
            $bankAccountId = BankAccount::factory();
        }

        $isPosted = $this->faker->boolean(40);

        return [
            'cash_session_id' => CashSession::factory(),
            'tender_type' => $tenderType,
            'amount' => $this->faker->randomFloat(2, 50, 2000),
            'category' => $this->faker->randomElement($categories),
            'vendor' => $this->faker->randomElement($vendors),
            'reference' => $this->faker->optional()->bothify('EXP-####????'),
            'notes' => $this->faker->optional()->sentence(),
            'card_terminal_id' => $cardTerminalId,
            'bank_account_id' => $bankAccountId,
            'incurred_at' => $this->faker->dateTimeBetween('-7 days', 'now'),
            'created_by' => User::factory(),
            'posted_by' => $isPosted ? User::factory() : null,
            'posted_at' => $isPosted ? $this->faker->dateTimeBetween('-3 days', 'now') : null,
            'meta' => [
                'receipt_number' => $this->faker->optional()->numerify('REC-######'),
                'approved_by' => $this->faker->optional()->name(),
            ],
        ];
    }

    /**
     * Indicate that the expense is cash tender.
     */
    public function cash(): static
    {
        return $this->state(fn (array $attributes) => [
            'tender_type' => CashExpense::TENDER_CASH,
            'card_terminal_id' => null,
            'bank_account_id' => null,
        ]);
    }

    /**
     * Indicate that the expense is card tender.
     */
    public function card(): static
    {
        return $this->state(fn (array $attributes) => [
            'tender_type' => CashExpense::TENDER_CARD,
            'card_terminal_id' => CashTerminal::factory(),
            'bank_account_id' => null,
        ]);
    }

    /**
     * Indicate that the expense is transfer tender.
     */
    public function transfer(): static
    {
        return $this->state(fn (array $attributes) => [
            'tender_type' => CashExpense::TENDER_TRANSFER,
            'card_terminal_id' => null,
            'bank_account_id' => BankAccount::factory(),
        ]);
    }

    /**
     * Indicate that the expense is posted.
     */
    public function posted(): static
    {
        return $this->state(fn (array $attributes) => [
            'posted_by' => User::factory(),
            'posted_at' => now(),
        ]);
    }

    /**
     * Indicate that the expense is draft.
     */
    public function draft(): static
    {
        return $this->state(fn (array $attributes) => [
            'posted_by' => null,
            'posted_at' => null,
        ]);
    }

    /**
     * Set a specific category.
     */
    public function category(string $category): static
    {
        return $this->state(fn (array $attributes) => [
            'category' => $category,
        ]);
    }
}
