<?php

declare(strict_types=1);

namespace Database\Seeders\Development;

use App\Models\Brand;
use App\Models\InventoryCategory;
use App\Models\Item;
use App\Models\ItemVariant;
use App\Models\PurchasePresentationTemplate;
use App\Models\UnitOfMeasure;
use App\Models\VariantPurchasePresentation;
use Database\Seeders\Base\RepeatableSeeder;
use Database\Seeders\Traits\RestoresTrashedOnUpsert;

/**
 * Believable resale Product catalog (Coca-Cola, Buldak, Peelez, Ramune,
 * Mochi) — Items of type PRODUCTO, their Variants and the reusable Purchase
 * Presentation Templates assigned to each Variant. Catalog data configured
 * in config/seeders.php under development_products, keyed by an ordered
 * list of product tuples (see that file's doc block for the exact shape).
 *
 * No cost, supplier, purchase, stock or branch price data is seeded here —
 * see doc/architecture/product-catalog/product-catalog-architecture.en.md.
 * Item.sku is intentionally left null for every Product (deprecated for
 * type=PRODUCTO — the Variant's own `code` is the real SKU).
 *
 * Depends on BrandSeeder, InventoryCategorySeeder,
 * PurchasePresentationTemplateSeeder and UnitOfMeasureSeeder having already
 * run.
 */
class ProductCatalogSeeder extends RepeatableSeeder
{
    use RestoresTrashedOnUpsert;

    public function run(): void
    {
        $unitUomId = UnitOfMeasure::where('code', 'UN')->value('id');

        if (! $unitUomId) {
            $this->command->warn("⚠️  UnitOfMeasure 'UN' not found. Skipping product catalog.");

            return;
        }

        $productCount = 0;
        $variantCount = 0;
        $presentationCount = 0;

        foreach (config('seeders.development_products', []) as $productTuple) {
            $category = InventoryCategory::where('name', $productTuple['category'])->first();
            $brand = Brand::where('name', $productTuple['brand'])->first();

            if (! $category || ! $brand) {
                $this->command->warn("⚠️  Brand '{$productTuple['brand']}' or InventoryCategory '{$productTuple['category']}' not found. Skipping product '{$productTuple['name']}'.");

                continue;
            }

            $item = $this->seedProduct($productTuple, $brand, $category);
            $productCount++;

            foreach ($productTuple['variants'] as $variantTuple) {
                $variant = $this->seedVariant($item, $variantTuple, $unitUomId);
                $variantCount++;

                foreach ($variantTuple['presentations'] as $presentationTuple) {
                    $this->seedPresentation($variant, $presentationTuple);
                    $presentationCount++;
                }
            }
        }

        $this->command->info("✓ Products seeded: {$productCount} ({$variantCount} variants, {$presentationCount} purchase presentations)");
    }

    private function seedProduct(array $tuple, Brand $brand, InventoryCategory $category): Item
    {
        return $this->upsertRestoringTrashed(
            Item::class,
            ['name' => $tuple['name'], 'inventory_category_id' => $category->id],
            [
                'description' => $tuple['description'],
                'type' => Item::TYPE_PRODUCTO,
                'sku' => null,
                'brand_id' => $brand->id,
                'is_stocked' => true,
                'is_perishable' => $tuple['is_perishable'],
                'is_active' => $tuple['is_active'],
            ],
        );
    }

    private function seedVariant(Item $item, array $tuple, int $unitUomId): ItemVariant
    {
        return $this->upsertRestoringTrashed(
            ItemVariant::class,
            ['code' => $tuple['code']],
            [
                'item_id' => $item->id,
                'uom_id' => $unitUomId,
                'barcode' => $tuple['barcode'],
                'name' => $tuple['name'],
                'is_active' => $tuple['is_active'],
            ],
        );
    }

    private function seedPresentation(ItemVariant $variant, array $tuple): void
    {
        $template = PurchasePresentationTemplate::where('code', $tuple['template'])->first();

        if (! $template) {
            $this->command->warn("⚠️  PurchasePresentationTemplate '{$tuple['template']}' not found. Skipping assignment for variant '{$variant->code}'.");

            return;
        }

        if ($tuple['is_default']) {
            // A developer may have swapped the default presentation through
            // the UI since the last seed. Clear any other active default for
            // this variant first so restoring the configured default below
            // never collides with variant_purchase_presentations_one_default_per_variant.
            VariantPurchasePresentation::where('item_variant_id', $variant->id)
                ->where('template_id', '!=', $template->id)
                ->where('is_default', true)
                ->update(['is_default' => false]);
        }

        $this->upsertRestoringTrashed(
            VariantPurchasePresentation::class,
            ['item_variant_id' => $variant->id, 'template_id' => $template->id],
            [
                'package_barcode' => $tuple['package_barcode'],
                'is_default' => $tuple['is_default'],
                'is_active' => $tuple['is_active'],
            ],
        );
    }
}
