<?php

namespace Database\Factories;

use App\Models\InventoryLocation;
use App\Models\StockTransfer;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\StockTransfer>
 */
class StockTransferFactory extends Factory
{
    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'source_location_id' => InventoryLocation::factory(),
            'destination_location_id' => InventoryLocation::factory(),
            'reference' => 'TR-'.fake()->unique()->numerify('####'),
            'transfer_date' => fake()->dateTimeBetween('-1 month', 'now')->format('Y-m-d'),
            'status' => StockTransfer::STATUS_DRAFT,
            'notes' => fake()->optional()->sentence(),
            'created_by_user_id' => User::factory(),
            'meta' => [],
        ];
    }

    public function posted(): static
    {
        return $this->state(fn () => [
            'status' => StockTransfer::STATUS_POSTED,
            'posted_at' => now(),
            'posted_by_user_id' => User::factory(),
        ]);
    }

    public function reversed(): static
    {
        return $this->state(fn () => [
            'status' => StockTransfer::STATUS_REVERSED,
            'posted_at' => now()->subDay(),
            'reversed_at' => now(),
            'reversed_by_user_id' => User::factory(),
            'reversal_reason' => fake()->sentence(),
        ]);
    }
}
