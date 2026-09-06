<?php

namespace Database\Factories;

use App\Models\ItemVariant;
use App\Models\StockTransfer;
use App\Models\UnitOfMeasure;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\StockTransferLine>
 */
class StockTransferLineFactory extends Factory
{
    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $quantity = fake()->randomFloat(2, 1, 50);

        return [
            'stock_transfer_id' => StockTransfer::factory(),
            'item_variant_id' => ItemVariant::factory(),
            'entry_uom_id' => UnitOfMeasure::factory(),
            'entry_quantity' => $quantity,
            'conversion_factor' => 1,
            'base_quantity' => $quantity,
            'source_unit_cost' => null,
            'meta' => [],
        ];
    }
}
