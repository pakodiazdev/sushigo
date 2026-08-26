<?php

namespace Database\Seeders\Fakes;

use App\Models\Supplier;
use App\Models\SupplierOffering;
use App\Models\VariantPurchasePresentation;
use Illuminate\Database\Seeder;

/**
 * Generate N fake Suppliers, each quoting a handful of existing Purchase
 * Presentations, via factories for volume testing (pagination across many
 * suppliers/offerings).
 *
 * Depends on a seeder that already populated variant_purchase_presentations
 * (e.g. Testing\ProductCatalogTestSeeder) having already run, following the
 * Fakes-after-Testing ordering convention (see TestReset::$seederGroups
 * 'fakes-purchasing').
 *
 * Counts are read from config/seeders.php → factory_counts.fake_suppliers
 * and factory_counts.fake_offerings_per_supplier.
 *
 * @see doc/conventions/testing/test-data-seeders.md (Fakes category)
 */
class FakeSuppliersSeeder extends Seeder
{
    public function run(): void
    {
        $supplierCount = config('seeders.factory_counts.fake_suppliers', 15);
        $offeringsPerSupplier = config('seeders.factory_counts.fake_offerings_per_supplier', 3);

        $presentationIds = VariantPurchasePresentation::pluck('id');

        if ($presentationIds->isEmpty()) {
            $this->command?->warn('⚠️  No variant_purchase_presentations found. Skipping fake suppliers — run the products seeder group first.');

            return;
        }

        $offeringCount = 0;

        for ($i = 0; $i < $supplierCount; $i++) {
            $supplier = Supplier::factory()->create();

            $presentationIds->random(min($offeringsPerSupplier, $presentationIds->count()))
                ->each(function (int $presentationId) use ($supplier, &$offeringCount) {
                    SupplierOffering::factory()->create([
                        'supplier_id' => $supplier->id,
                        'variant_purchase_presentation_id' => $presentationId,
                    ]);

                    $offeringCount++;
                });
        }

        $this->command?->info("✓ Created {$supplierCount} fake suppliers with {$offeringCount} offerings total");
    }
}
