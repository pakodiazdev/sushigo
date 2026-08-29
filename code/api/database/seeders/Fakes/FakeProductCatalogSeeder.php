<?php

namespace Database\Seeders\Fakes;

use App\Models\Brand;
use App\Models\InventoryCategory;
use App\Models\Item;
use App\Models\ItemVariant;
use App\Models\UnitOfMeasure;
use Illuminate\Database\Seeder;

/**
 * Generate N fake Products, each with M fake Variants, via factories for
 * volume testing (pagination across many products/variants).
 *
 * Depends on ProductCatalogTestSeeder having already run — reuses its
 * seeded Brands, InventoryCategories and 'UN' UnitOfMeasure rather than
 * creating its own, following the Fakes-after-Testing ordering convention
 * (see TestReset::$seederGroups 'fakes-products').
 *
 * Variant cost/price/stock fields are always zeroed/nulled, never left to
 * factory defaults — catalog seeds must not invent permanent financial data
 * (see doc/architecture/product-catalog/product-catalog-architecture.en.md).
 *
 * Counts are read from config/seeders.php → factory_counts.fake_products
 * and factory_counts.fake_variants_per_product.
 *
 * @see doc/conventions/testing/test-data-seeders.md (Fakes category)
 */
class FakeProductCatalogSeeder extends Seeder
{
    public function run(): void
    {
        $productCount = config('seeders.factory_counts.fake_products', 20);
        $variantsPerProduct = config('seeders.factory_counts.fake_variants_per_product', 2);

        $uomId = UnitOfMeasure::where('code', 'UN')->value('id');
        $brandIds = Brand::pluck('id');
        $categoryIds = InventoryCategory::pluck('id');

        if (! $uomId || $brandIds->isEmpty() || $categoryIds->isEmpty()) {
            $this->command?->warn('⚠️  Missing UnitOfMeasure/Brand/InventoryCategory rows. Skipping fake product catalog — run the products seeder group first.');

            return;
        }

        for ($i = 0; $i < $productCount; $i++) {
            $product = Item::factory()->create([
                'type' => Item::TYPE_PRODUCTO,
                'sku' => null,
                'brand_id' => $brandIds->random(),
                'inventory_category_id' => $categoryIds->random(),
                'is_active' => true,
            ]);

            ItemVariant::factory($variantsPerProduct)->create([
                'item_id' => $product->id,
                'uom_id' => $uomId,
                'barcode' => fn () => fake()->unique()->ean13(),
            ]);
        }

        $this->command?->info("✓ Created {$productCount} fake products with {$variantsPerProduct} variants each");
    }
}
