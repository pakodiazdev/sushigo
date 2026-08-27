<?php

namespace Database\Seeders\Testing;

use App\Models\Item;
use App\Models\PurchasePresentationTemplate;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

/**
 * Product catalog test seeder — deterministic Brands/Categories/Products/
 * Variants/Purchase Presentations for Cypress/PHPUnit.
 *
 * Self-contained (like DishesTestSeeder): inserts its own 'UN' unit of
 * measure row rather than depending on UnitOfMeasureSeeder, since no other
 * Testing seeder currently provides one.
 *
 * Creates 2 brands, 2 categories, 2 purchase presentation templates (UNIT,
 * BOX) and 3 products covering: a multi-Variant product, a single-Variant
 * product, and a product with one inactive Variant.
 *
 * No idempotency checks — always starts from truncated tables.
 * Optimized for speed: bulk DB::table()->insert(), no Eloquent events.
 * ULIDs generated manually for models that use HasPublicId.
 */
class ProductCatalogTestSeeder extends Seeder
{
    public function run(): void
    {
        $now = now();

        $uomId = $this->seedUnitOfMeasure($now);
        $brandIds = $this->seedBrands($now);
        $categoryIds = $this->seedCategories($now);
        $templateIds = $this->seedTemplates($uomId, $now);
        $itemIds = $this->seedItems($brandIds, $categoryIds, $now);
        $variantIds = $this->seedVariants($itemIds, $uomId, $now);
        $this->seedPresentations($variantIds, $templateIds, $now);
    }

    private function seedUnitOfMeasure($now): int
    {
        return DB::table('units_of_measure')->insertGetId($this->publicIdRow([
            'code' => 'UN',
            'name' => 'Unidad',
            'symbol' => 'un',
            'precision' => 0,
            'is_decimal' => false,
            'is_active' => true,
            'meta' => json_encode([]),
            'created_at' => $now,
            'updated_at' => $now,
        ]));
    }

    /**
     * @return array<string, int> brand name => id
     */
    private function seedBrands($now): array
    {
        DB::table('brands')->insert([
            $this->publicIdRow(['name' => 'Coca-Cola', 'is_active' => true, 'created_at' => $now, 'updated_at' => $now]),
            $this->publicIdRow(['name' => 'Buldak', 'is_active' => true, 'created_at' => $now, 'updated_at' => $now]),
        ]);

        return DB::table('brands')->pluck('id', 'name')->toArray();
    }

    /**
     * @return array<string, int> category name => id
     */
    private function seedCategories($now): array
    {
        DB::table('inventory_categories')->insert([
            $this->publicIdRow(['name' => 'Bebidas', 'position' => 0, 'is_active' => true, 'created_at' => $now, 'updated_at' => $now]),
            $this->publicIdRow(['name' => 'Ramen Instantáneo', 'position' => 1, 'is_active' => true, 'created_at' => $now, 'updated_at' => $now]),
        ]);

        return DB::table('inventory_categories')->pluck('id', 'name')->toArray();
    }

    /**
     * @return array<string, int> template code => id
     */
    private function seedTemplates(int $uomId, $now): array
    {
        DB::table('purchase_presentation_templates')->insert([
            $this->publicIdRow([
                'code' => 'UNIT_1', 'name' => 'Unidad Individual',
                'package_type' => PurchasePresentationTemplate::PACKAGE_TYPE_UNIT, 'base_unit_quantity' => 1,
                'compatible_dimension_uom_id' => $uomId, 'is_active' => true, 'created_at' => $now, 'updated_at' => $now,
            ]),
            $this->publicIdRow([
                'code' => 'BOX_24', 'name' => 'Caja x24',
                'package_type' => PurchasePresentationTemplate::PACKAGE_TYPE_BOX, 'base_unit_quantity' => 24,
                'compatible_dimension_uom_id' => $uomId, 'is_active' => true, 'created_at' => $now, 'updated_at' => $now,
            ]),
        ]);

        return DB::table('purchase_presentation_templates')->pluck('id', 'code')->toArray();
    }

    /**
     * @param  array<string, int>  $brandIds
     * @param  array<string, int>  $categoryIds
     * @return array<string, int> item name => id
     */
    private function seedItems(array $brandIds, array $categoryIds, $now): array
    {
        DB::table('items')->insert([
            $this->itemRow('Coca-Cola', 'Refresco de cola clásico.', $brandIds['Coca-Cola'], $categoryIds['Bebidas'], true, $now),
            $this->itemRow('Coca-Cola Sin Azúcar', 'Refresco de cola sin azúcar.', $brandIds['Coca-Cola'], $categoryIds['Bebidas'], true, $now),
            $this->itemRow('Buldak Ramen', 'Ramen instantáneo coreano extra picante.', $brandIds['Buldak'], $categoryIds['Ramen Instantáneo'], true, $now),
        ]);

        return DB::table('items')->pluck('id', 'name')->toArray();
    }

    /**
     * @param  array<string, int>  $itemIds
     * @return array<string, int> variant code => id
     */
    private function seedVariants(array $itemIds, int $uomId, $now): array
    {
        DB::table('item_variants')->insert([
            $this->variantRow($itemIds['Coca-Cola'], $uomId, 'COKE-CAN-355', 'Lata 355ml', '7501055300013', true, $now),
            $this->variantRow($itemIds['Coca-Cola'], $uomId, 'COKE-BOT-600', 'Botella 600ml', '7501055300020', true, $now),
            $this->variantRow($itemIds['Coca-Cola Sin Azúcar'], $uomId, 'COKEZERO-CAN-355', 'Lata 355ml', '7501055301010', true, $now),
            $this->variantRow($itemIds['Buldak Ramen'], $uomId, 'BULDAK-ORIGINAL-140', 'Original 140g', '8801073114517', true, $now),
            $this->variantRow($itemIds['Buldak Ramen'], $uomId, 'BULDAK-CARBONARA-140', 'Carbonara 140g', '8801073131149', false, $now),
        ]);

        return DB::table('item_variants')->pluck('id', 'code')->toArray();
    }

    /**
     * @param  array<string, int>  $variantIds
     * @param  array<string, int>  $templateIds
     */
    private function seedPresentations(array $variantIds, array $templateIds, $now): void
    {
        DB::table('variant_purchase_presentations')->insert([
            $this->presentationRow($variantIds['COKE-CAN-355'], $templateIds['BOX_24'], true, $now),
            $this->presentationRow($variantIds['COKE-BOT-600'], $templateIds['UNIT_1'], true, $now),
            $this->presentationRow($variantIds['COKEZERO-CAN-355'], $templateIds['UNIT_1'], true, $now),
            $this->presentationRow($variantIds['BULDAK-ORIGINAL-140'], $templateIds['UNIT_1'], true, $now),
        ]);
    }

    private function itemRow(string $name, string $description, int $brandId, int $categoryId, bool $isActive, $now): array
    {
        return $this->publicIdRow([
            'name' => $name,
            'description' => $description,
            'type' => Item::TYPE_PRODUCTO,
            'brand_id' => $brandId,
            'inventory_category_id' => $categoryId,
            'is_stocked' => true,
            'is_perishable' => false,
            'is_active' => $isActive,
            'created_at' => $now,
            'updated_at' => $now,
        ]);
    }

    private function variantRow(int $itemId, int $uomId, string $code, string $name, string $barcode, bool $isActive, $now): array
    {
        return $this->publicIdRow([
            'item_id' => $itemId,
            'uom_id' => $uomId,
            'code' => $code,
            'name' => $name,
            'barcode' => $barcode,
            'last_unit_cost' => 0,
            'avg_unit_cost' => 0,
            'is_active' => $isActive,
            'created_at' => $now,
            'updated_at' => $now,
        ]);
    }

    private function presentationRow(int $variantId, int $templateId, bool $isDefault, $now): array
    {
        return $this->publicIdRow([
            'item_variant_id' => $variantId,
            'template_id' => $templateId,
            'is_default' => $isDefault,
            'is_active' => true,
            'meta' => json_encode([]),
            'created_at' => $now,
            'updated_at' => $now,
        ]);
    }

    private function publicIdRow(array $attributes): array
    {
        return array_merge(['public_id' => (string) Str::ulid()], $attributes);
    }
}
