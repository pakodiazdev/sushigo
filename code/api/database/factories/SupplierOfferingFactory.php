<?php

namespace Database\Factories;

use App\Models\Supplier;
use App\Models\VariantPurchasePresentation;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\SupplierOffering>
 */
class SupplierOfferingFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'supplier_id' => Supplier::inRandomOrder()->first()?->id,
            'variant_purchase_presentation_id' => VariantPurchasePresentation::inRandomOrder()->first()?->id,
            'supplier_code' => fake()->bothify('OFR-####??'),
            'quoted_price' => fake()->randomFloat(4, 20, 800),
            'currency' => 'MXN',
            'valid_from' => null,
            'valid_until' => null,
            'minimum_order_quantity' => fake()->randomElement([1, 5, 10, 24]),
            'lead_time_days' => fake()->numberBetween(1, 15),
            'is_active' => true,
        ];
    }
}
