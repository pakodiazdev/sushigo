<?php

namespace Tests\Feature\Inventory;

use App\Models\ItemVariant;
use App\Models\OperatingUnit;
use App\Models\Receipt;
use App\Models\Stock;
use Database\Seeders\BranchSeeder;
use Database\Seeders\Development\BrandSeeder;
use Database\Seeders\Development\InventoryCategorySeeder;
use Database\Seeders\Development\PermissionSeeder;
use Database\Seeders\Development\ProductCatalogSeeder;
use Database\Seeders\Development\PurchasePresentationTemplateSeeder;
use Database\Seeders\Development\PurchaseReceiptSeeder;
use Database\Seeders\Development\RoleSeeder;
use Database\Seeders\Development\SupplierSeeder;
use Database\Seeders\Development\UserSeeder;
use Database\Seeders\InventoryLocationSeeder;
use Database\Seeders\OperatingUnitSeeder;
use Database\Seeders\UnitOfMeasureSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class PurchaseReceiptSeederTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(RoleSeeder::class);
        $this->seed(PermissionSeeder::class);
        $this->seed(BranchSeeder::class);
        $this->seed(OperatingUnitSeeder::class);
        $this->seed(InventoryLocationSeeder::class);
        $this->seed(UserSeeder::class);
        $this->seed(UnitOfMeasureSeeder::class);
        $this->seed(BrandSeeder::class);
        $this->seed(InventoryCategorySeeder::class);
        $this->seed(PurchasePresentationTemplateSeeder::class);
        $this->seed(ProductCatalogSeeder::class);
        $this->seed(SupplierSeeder::class);
    }

    #[Test]
    public function posts_the_configured_receipt_and_normalizes_bonus_packages_into_base_units(): void
    {
        $this->seed(PurchaseReceiptSeeder::class);

        $config = config('seeders.development_purchase_receipt');
        $receipt = Receipt::where('reference', $config['reference'])->firstOrFail();

        $this->assertTrue($receipt->isPosted());

        $line = $receipt->lines()->first();
        $lineConfig = $config['lines'][0];

        // 10 packages received (8 paid + 2 bonus) x 24 base units/box = 240.
        $this->assertEquals(240.0, (float) $line->base_units_received);

        $expectedNet = $lineConfig['gross_amount'] - $lineConfig['discounts'] + $lineConfig['allocated_expenses'] + $lineConfig['non_recoverable_taxes'];
        $this->assertEquals($expectedNet, (float) $line->net_acquisition_amount);
        $this->assertEquals(round($expectedNet / 240, 4), round((float) $line->effective_unit_cost, 4));
    }

    #[Test]
    public function updates_the_destination_stock_balance_and_weighted_average_cost(): void
    {
        $this->seed(PurchaseReceiptSeeder::class);

        $variantId = ItemVariant::where('code', 'COKE-ORIG-CAN355')->value('id');
        $mainUnit = OperatingUnit::where('type', OperatingUnit::TYPE_BRANCH_MAIN)->firstOrFail();

        $stock = Stock::whereHas('inventoryLocation', fn ($q) => $q->where('operating_unit_id', $mainUnit->id)->where('type', 'MAIN'))
            ->where('item_variant_id', $variantId)
            ->first();

        $this->assertNotNull($stock);
        $this->assertEquals(240.0, (float) $stock->on_hand);
        $this->assertGreaterThan(0, (float) $stock->weighted_avg_cost);
    }

    #[Test]
    public function is_idempotent_and_does_not_double_post_on_re_seed(): void
    {
        $this->seed(PurchaseReceiptSeeder::class);
        $this->seed(PurchaseReceiptSeeder::class);

        $config = config('seeders.development_purchase_receipt');
        $this->assertSame(1, Receipt::where('reference', $config['reference'])->count());

        $variantId = ItemVariant::where('code', 'COKE-ORIG-CAN355')->value('id');
        $mainUnit = OperatingUnit::where('type', OperatingUnit::TYPE_BRANCH_MAIN)->firstOrFail();
        $stock = Stock::whereHas('inventoryLocation', fn ($q) => $q->where('operating_unit_id', $mainUnit->id)->where('type', 'MAIN'))
            ->where('item_variant_id', $variantId)
            ->first();

        $this->assertEquals(240.0, (float) $stock->on_hand, 'Re-seeding must not double-post the Receipt into Stock');
    }
}
