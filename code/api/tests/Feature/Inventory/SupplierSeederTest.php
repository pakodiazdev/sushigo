<?php

namespace Tests\Feature\Inventory;

use App\Models\ItemVariant;
use App\Models\Supplier;
use App\Models\SupplierOffering;
use App\Models\VariantPurchasePresentation;
use Database\Seeders\Development\BrandSeeder;
use Database\Seeders\Development\InventoryCategorySeeder;
use Database\Seeders\Development\ProductCatalogSeeder;
use Database\Seeders\Development\PurchasePresentationTemplateSeeder;
use Database\Seeders\Development\SupplierSeeder;
use Database\Seeders\UnitOfMeasureSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class SupplierSeederTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(UnitOfMeasureSeeder::class);
        $this->seed(BrandSeeder::class);
        $this->seed(InventoryCategorySeeder::class);
        $this->seed(PurchasePresentationTemplateSeeder::class);
        $this->seed(ProductCatalogSeeder::class);
    }

    #[Test]
    public function seeds_every_configured_supplier(): void
    {
        $this->seed(SupplierSeeder::class);

        foreach (config('seeders.development_suppliers') as $tuple) {
            $this->assertDatabaseHas('suppliers', ['code' => $tuple['code'], 'name' => $tuple['name']]);
        }
    }

    #[Test]
    public function two_suppliers_quote_the_same_presentation_at_different_prices(): void
    {
        $this->seed(SupplierSeeder::class);

        $variantId = ItemVariant::where('code', 'COKE-ORIG-CAN355')->value('id');
        $presentationId = VariantPurchasePresentation::where('item_variant_id', $variantId)
            ->whereHas('template', fn ($q) => $q->where('code', 'BOX_24'))
            ->value('id');

        $offerings = SupplierOffering::where('variant_purchase_presentation_id', $presentationId)->get();

        $this->assertSame(2, $offerings->count());
        $this->assertSame(2, $offerings->pluck('quoted_price')->unique()->count(), 'Both offerings must quote different prices');
    }

    #[Test]
    public function skips_an_offering_whose_variant_is_missing_without_aborting_the_rest(): void
    {
        ItemVariant::where('code', 'BULDAK-ORIGINAL-140')->firstOrFail()->delete();

        $this->seed(SupplierSeeder::class);

        $this->assertDatabaseMissing('supplier_offerings', ['supplier_code' => 'KF-ORIG140-24']);
        $this->assertDatabaseHas('supplier_offerings', ['supplier_code' => 'CF-CAN355-24']);
    }

    #[Test]
    public function is_idempotent_when_run_more_than_once(): void
    {
        $this->seed(SupplierSeeder::class);
        $suppliersAfterFirstRun = Supplier::count();
        $offeringsAfterFirstRun = SupplierOffering::count();

        $this->seed(SupplierSeeder::class);

        $this->assertSame($suppliersAfterFirstRun, Supplier::count());
        $this->assertSame($offeringsAfterFirstRun, SupplierOffering::count());
    }

    #[Test]
    public function restores_a_soft_deleted_supplier_on_re_seed(): void
    {
        $this->seed(SupplierSeeder::class);

        Supplier::where('code', 'SUP-COCAFEMSA')->first()->delete();
        $this->assertSoftDeleted('suppliers', ['code' => 'SUP-COCAFEMSA']);

        $this->seed(SupplierSeeder::class);

        $this->assertDatabaseHas('suppliers', ['code' => 'SUP-COCAFEMSA', 'deleted_at' => null]);
    }
}
