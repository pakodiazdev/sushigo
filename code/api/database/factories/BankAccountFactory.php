<?php

namespace Database\Factories;

use App\Models\Branch;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\BankAccount>
 */
class BankAccountFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $banks = [
            'BBVA',
            'Santander',
            'Banorte',
            'HSBC',
            'Citibanamex',
            'Scotiabank',
            'Inbursa',
        ];

        $bankName = $this->faker->randomElement($banks);
        $accountNumber = $this->faker->numerify('################');
        $lastFour = substr($accountNumber, -4);

        return [
            'branch_id' => Branch::factory(),
            'alias' => $bankName.' - '.$this->faker->randomElement(['Nomina', 'Operaciones', 'Principal']),
            'bank_name' => $bankName,
            'account_number_masked' => '************'.$lastFour,
            'clabe_masked' => $this->faker->numerify('##############').'****',
            'is_active' => true,
            'meta' => [
                'account_type' => $this->faker->randomElement(['checking', 'savings']),
                'branch_office' => $this->faker->optional()->numerify('####'),
                'swift_code' => $this->faker->optional()->bothify('???MX??###'),
            ],
        ];
    }

    /**
     * Indicate that the account is inactive.
     */
    public function inactive(): static
    {
        return $this->state(fn (array $attributes) => [
            'is_active' => false,
        ]);
    }

    /**
     * Set a specific bank.
     */
    public function bank(string $bankName): static
    {
        return $this->state(fn (array $attributes) => [
            'bank_name' => $bankName,
            'alias' => $bankName.' - Principal',
        ]);
    }
}
