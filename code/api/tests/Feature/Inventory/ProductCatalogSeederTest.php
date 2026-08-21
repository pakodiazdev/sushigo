<?php

namespace Tests\Feature\Inventory;

use App\Models\Brand;
use App\Models\InventoryCategory;
use App\Models\Item;
use App\Models\ItemVariant;
use App\Models\PurchasePresentationTemplate;
use Database\Seeders\Development\BrandSeeder;
use Database\Seeders\Development\InventoryCategorySeeder;
use Database\Seeders\Development\ProductCatalogSeeder;
use Database\Seeders\Development\PurchasePresentationTemplateSeeder;
use Database\Seeders\UnitOfMeasureSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class ProductCatalogSeederTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(UnitOfMeasureSeeder::class);
        $this->seed(BrandSeeder::class);
        $this->seed(InventoryCategorySeeder::class);
        $this->seed(PurchasePresentationTemplateSeeder::class);
    }

    #[Test]
    public function seeds_a_believable_spread_of_products_per_brand(): void
    {
        $this->seed(ProductCatalogSeeder::class);

        foreach (Brand::pluck('id') as $brandId) {
            $count = Item::where('brand_id', $brandId)->count();
            $this->assertGreaterThanOrEqual(1, $count, "Brand id {$brandId} has no products");
        }

        $this->assertSame(9, DB::table('items')->where('type', Item::TYPE_PRODUCTO)->count());
    }

    #[Test]
    public function every_product_has_a_realistic_description(): void
    {
        $this->seed(ProductCatalogSeeder::class);

        $products = Item::where('type', Item::TYPE_PRODUCTO)->get();

        $this->assertGreaterThan(0, $products->count());

        foreach ($products as $product) {
            $this->assertNotEmpty($product->description);
            $this->assertNull($product->sku, 'Product.sku is deprecated and must stay null for seeded Products');
        }
    }

    #[Test]
    public function demonstrates_single_and_multi_variant_products(): void
    {
        $this->seed(ProductCatalogSeeder::class);

        $cocaCola = Item::where('name', 'Coca-Cola')->first();
        $this->assertNotNull($cocaCola);
        $this->assertSame(3, $cocaCola->variants()->count(), 'Coca-Cola should demonstrate a multi-Variant Product');

        $cocaColaZero = Item::where('name', 'Coca-Cola Sin Azúcar')->first();
        $this->assertNotNull($cocaColaZero);
        $this->assertSame(1, $cocaColaZero->variants()->count(), 'Coca-Cola Sin Azúcar should demonstrate a single-Variant Product');
    }

    #[Test]
    public function demonstrates_every_purchase_presentation_package_type_assigned_to_a_variant(): void
    {
        $this->seed(ProductCatalogSeeder::class);

        $assignedTypes = DB::table('variant_purchase_presentations')
            ->join('purchase_presentation_templates', 'variant_purchase_presentations.template_id', '=', 'purchase_presentation_templates.id')
            ->pluck('package_type')
            ->unique()
            ->sort()
            ->values()
            ->toArray();

        $this->assertSame(['BOX', 'PACK', 'TRAY', 'UNIT'], $assignedTypes);
    }

    #[Test]
    public function every_variant_has_a_unique_barcode(): void
    {
        $this->seed(ProductCatalogSeeder::class);

        $barcodes = ItemVariant::pluck('barcode');

        $this->assertGreaterThan(0, $barcodes->count());
        $this->assertSame($barcodes->count(), $barcodes->unique()->count(), 'Every seeded Variant barcode must be unique');
    }

    #[Test]
    public function demonstrates_inactive_records_at_every_level(): void
    {
        $this->seed(ProductCatalogSeeder::class);

        $this->assertDatabaseHas('items', ['name' => 'Coca-Cola Vainilla', 'is_active' => false]);
        $this->assertDatabaseHas('item_variants', ['code' => 'BULDAK-CARBONARA-140', 'is_active' => false]);
        $this->assertDatabaseHas('variant_purchase_presentations', ['is_active' => false]);
    }

    #[Test]
    public function seeds_no_invented_cost_price_or_stock_data(): void
    {
        $this->seed(ProductCatalogSeeder::class);

        foreach (ItemVariant::all() as $variant) {
            $this->assertNull($variant->sale_price, "Variant {$variant->code} must not have an invented sale_price");
            $this->assertSame('0.0000', (string) $variant->last_unit_cost, "Variant {$variant->code} must not have an invented last_unit_cost");
            $this->assertSame('0.0000', (string) $variant->avg_unit_cost, "Variant {$variant->code} must not have an invented avg_unit_cost");
            $this->assertSame('0.0000', (string) $variant->min_stock, "Variant {$variant->code} must not have an invented min_stock");
            $this->assertSame('0.0000', (string) $variant->max_stock, "Variant {$variant->code} must not have an invented max_stock");
        }
    }

    #[Test]
    public function skips_seeding_when_the_unit_uom_is_missing(): void
    {
        // Rename rather than delete — the 'UN' row is already referenced by
        // the Purchase Presentation Templates seeded in setUp(), so deleting
        // it would violate that foreign key instead of exercising the
        // "not found by code" branch this test targets.
        DB::table('units_of_measure')->where('code', 'UN')->update(['code' => 'XX']);

        $this->seed(ProductCatalogSeeder::class);

        $this->assertSame(0, DB::table('items')->where('type', Item::TYPE_PRODUCTO)->count());
    }

    #[Test]
    public function skips_a_product_whose_brand_is_missing_without_aborting_the_rest(): void
    {
        Brand::where('name', 'Buldak')->first()->delete();

        $this->seed(ProductCatalogSeeder::class);

        $this->assertDatabaseMissing('items', ['name' => 'Buldak Ramen']);
        $this->assertDatabaseHas('items', ['name' => 'Coca-Cola']);
    }

    #[Test]
    public function skips_a_presentation_whose_template_is_missing_without_aborting_the_rest(): void
    {
        PurchasePresentationTemplate::where('code', 'BOX_24')->first()->delete();

        $this->seed(ProductCatalogSeeder::class);

        $variantId = ItemVariant::where('code', 'COKE-ORIG-CAN355')->value('id');
        $boxTemplateId = PurchasePresentationTemplate::withTrashed()->where('code', 'BOX_24')->value('id');
        $unitTemplateId = PurchasePresentationTemplate::where('code', 'UNIT_1')->value('id');

        $this->assertDatabaseMissing('variant_purchase_presentations', ['item_variant_id' => $variantId, 'template_id' => $boxTemplateId]);
        $this->assertDatabaseHas('variant_purchase_presentations', ['item_variant_id' => $variantId, 'template_id' => $unitTemplateId]);
    }

    #[Test]
    public function is_idempotent_when_run_more_than_once(): void
    {
        $this->seed(ProductCatalogSeeder::class);
        $itemsAfterFirstRun = Item::count();
        $variantsAfterFirstRun = ItemVariant::count();
        $presentationsAfterFirstRun = DB::table('variant_purchase_presentations')->count();

        $this->seed(ProductCatalogSeeder::class);

        $this->assertSame($itemsAfterFirstRun, Item::count());
        $this->assertSame($variantsAfterFirstRun, ItemVariant::count());
        $this->assertSame($presentationsAfterFirstRun, DB::table('variant_purchase_presentations')->count());
    }

    #[Test]
    public function re_seeding_after_manually_swapping_the_default_presentation_does_not_violate_the_unique_default_constraint(): void
    {
        $this->seed(ProductCatalogSeeder::class);

        $variantId = ItemVariant::where('code', 'COKE-ORIG-CAN355')->value('id');
        $boxTemplateId = PurchasePresentationTemplate::where('code', 'BOX_24')->value('id');
        $unitTemplateId = PurchasePresentationTemplate::where('code', 'UNIT_1')->value('id');

        $this->assertDatabaseHas('variant_purchase_presentations', [
            'item_variant_id' => $variantId,
            'template_id' => $boxTemplateId,
            'is_default' => true,
        ]);

        // Mimic a developer swapping the default through the UI: clear the
        // old default first, then set the new one — the same order the app's
        // transactional service would use, which is what makes the reversed
        // state below possible without ever violating the constraint.
        DB::table('variant_purchase_presentations')
            ->where('item_variant_id', $variantId)->where('template_id', $boxTemplateId)
            ->update(['is_default' => false]);
        DB::table('variant_purchase_presentations')
            ->where('item_variant_id', $variantId)->where('template_id', $unitTemplateId)
            ->update(['is_default' => true]);

        // Re-seeding must restore BOX_24 as the configured default without
        // the database rejecting the write because UNIT_1 currently holds it.
        $this->seed(ProductCatalogSeeder::class);

        $this->assertDatabaseHas('variant_purchase_presentations', [
            'item_variant_id' => $variantId,
            'template_id' => $boxTemplateId,
            'is_default' => true,
        ]);
        $this->assertDatabaseHas('variant_purchase_presentations', [
            'item_variant_id' => $variantId,
            'template_id' => $unitTemplateId,
            'is_default' => false,
        ]);
    }

    #[Test]
    public function does_not_create_a_duplicate_when_a_product_was_soft_deleted(): void
    {
        $this->seed(ProductCatalogSeeder::class);
        $totalBeforeDelete = Item::withTrashed()->count();

        Item::where('name', 'Coca-Cola')->first()->delete();

        $this->seed(ProductCatalogSeeder::class);

        $this->assertSame(
            $totalBeforeDelete,
            Item::withTrashed()->count(),
            'Re-seeding after a soft delete must update the trashed row, not insert a duplicate',
        );
    }

    #[Test]
    public function restores_a_soft_deleted_product_and_its_variant_on_re_seed(): void
    {
        $this->seed(ProductCatalogSeeder::class);

        $product = Item::where('name', 'Coca-Cola')->first();
        $variant = ItemVariant::where('code', 'COKE-ORIG-CAN355')->first();
        $product->delete();
        $variant->delete();

        $this->assertSoftDeleted('items', ['name' => 'Coca-Cola']);
        $this->assertSoftDeleted('item_variants', ['code' => 'COKE-ORIG-CAN355']);

        $this->seed(ProductCatalogSeeder::class);

        $this->assertDatabaseHas('items', ['name' => 'Coca-Cola', 'deleted_at' => null]);
        $this->assertDatabaseHas('item_variants', ['code' => 'COKE-ORIG-CAN355', 'deleted_at' => null]);
    }

    #[Test]
    public function restoring_a_soft_deleted_category_on_re_seed_keeps_its_products_stable(): void
    {
        // Unlike DishCategory, InventoryCategory does not cascade-delete its
        // Products — Item::inventoryCategory() deliberately uses withTrashed()
        // so a Product keeps its historical category reference even while
        // the category itself is soft-deleted (see product-catalog-architecture
        // §3.3). This test asserts that behavior, plus that restoring the
        // category and re-seeding the catalog stays idempotent around it.
        $this->seed(ProductCatalogSeeder::class);
        $itemCountBefore = DB::table('items')->where('type', Item::TYPE_PRODUCTO)->count();

        InventoryCategory::where('name', 'Bebidas')->first()->delete();
        $this->assertSoftDeleted('inventory_categories', ['name' => 'Bebidas']);
        $this->assertDatabaseHas('items', ['name' => 'Coca-Cola', 'deleted_at' => null]);

        $this->seed(InventoryCategorySeeder::class);
        $this->seed(ProductCatalogSeeder::class);

        $this->assertDatabaseHas('inventory_categories', ['name' => 'Bebidas', 'deleted_at' => null]);
        $this->assertDatabaseHas('items', ['name' => 'Coca-Cola', 'deleted_at' => null]);
        $this->assertSame($itemCountBefore, DB::table('items')->where('type', Item::TYPE_PRODUCTO)->count());
    }
}
