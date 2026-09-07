<?php

namespace Database\Seeders\Testing;

use App\DataTransferObjects\Inventory\ReceiptLineData;
use App\DataTransferObjects\Inventory\SaveReceiptData;
use App\Models\Branch;
use App\Models\InventoryLocation;
use App\Models\ItemVariant;
use App\Models\OperatingUnit;
use App\Models\PriceList;
use App\Models\PriceListAssignment;
use App\Models\PurchasePresentationTemplate;
use App\Models\Supplier;
use App\Models\SupplierOffering;
use App\Models\User;
use App\Models\VariantPrice;
use App\Models\VariantPurchasePresentation;
use App\Services\Inventory\ReceiptService;
use App\Support\Clock\ApplicationClock;
use Carbon\Carbon;
use Illuminate\Database\Seeder;

/**
 * Deterministic purchasing/pricing fixtures for Cypress/PHPUnit (#437): two
 * Suppliers quoting the same Presentation at different prices, one posted
 * Receipt demonstrating package normalization + bonus packages + an
 * allocated freight expense driving effective/weighted-average cost, and a
 * Standard vs. event-Operating-Unit price difference for the same Variant
 * plus a short time-boxed promotion — mirrors the Development story at test
 * scale.
 *
 * No idempotency checks — always starts from truncated tables, like
 * CashSessionDetailSeeder.
 *
 * Requires CoreTestSeeder (branch MAIN, admin user) and
 * ProductCatalogTestSeeder (COKE-CAN-355 / BULDAK-ORIGINAL-140 and their
 * BOX_24/UNIT_1 Purchase Presentations) to already have run.
 */
class PurchasingTestSeeder extends Seeder
{
    public function run(): void
    {
        $branch = Branch::where('code', 'MAIN')->firstOrFail();
        $mainUnit = OperatingUnit::where('branch_id', $branch->id)->where('type', OperatingUnit::TYPE_BRANCH_MAIN)->firstOrFail();
        $admin = User::where('email', 'admin@sushigo.com')->firstOrFail();

        // This seeder posts a Receipt into this location, so it must be a valid
        // purchase-receiving destination (#568/#572) regardless of seeder order.
        $destination = InventoryLocation::firstOrCreate(
            ['operating_unit_id' => $mainUnit->id, 'type' => InventoryLocation::TYPE_MAIN],
            ['name' => 'Almacén Principal', 'is_primary' => true, 'priority' => 100, 'can_receive_purchases' => true],
        );
        $destination->forceFill(['can_receive_purchases' => true])->save();

        $eventUnit = OperatingUnit::create([
            'branch_id' => $branch->id,
            'type' => OperatingUnit::TYPE_EVENT_TEMP,
            'name' => 'Bazar de Prueba',
            'is_active' => true,
        ]);

        $cokeVariantId = ItemVariant::where('code', 'COKE-CAN-355')->value('id');
        $buldakVariantId = ItemVariant::where('code', 'BULDAK-ORIGINAL-140')->value('id');
        $boxTemplateId = PurchasePresentationTemplate::where('code', 'BOX_24')->value('id');
        $presentationId = VariantPurchasePresentation::where('item_variant_id', $cokeVariantId)
            ->where('template_id', $boxTemplateId)
            ->value('id');

        $supplierA = Supplier::create(['code' => 'SUP-TEST-A', 'name' => 'Proveedor Test A', 'is_active' => true]);
        $supplierB = Supplier::create(['code' => 'SUP-TEST-B', 'name' => 'Proveedor Test B', 'is_active' => true]);

        $offeringA = SupplierOffering::create([
            'supplier_id' => $supplierA->id,
            'variant_purchase_presentation_id' => $presentationId,
            'quoted_price' => 480.00,
            'currency' => 'MXN',
            'minimum_order_quantity' => 1,
            'is_active' => true,
        ]);

        SupplierOffering::create([
            'supplier_id' => $supplierB->id,
            'variant_purchase_presentation_id' => $presentationId,
            'quoted_price' => 460.00,
            'currency' => 'MXN',
            'minimum_order_quantity' => 1,
            'is_active' => true,
        ]);

        $receiptService = app(ReceiptService::class);

        $receipt = $receiptService->createDraft(new SaveReceiptData(
            supplierId: $supplierA->id,
            destinationLocationId: $destination->id,
            reference: 'FAC-TEST-PURCH-001',
            receiptDate: app(ApplicationClock::class)->todayInBusinessTz(),
            notes: 'Fixture de prueba: reabasto con bonificación y flete asignado.',
            actingUserId: $admin->id,
            lines: [
                new ReceiptLineData(
                    variantPurchasePresentationId: $presentationId,
                    supplierOfferingId: $offeringA->id,
                    orderedPackages: 8,
                    receivedPackages: 10,
                    bonusPackages: 2,
                    grossAmount: 3840.00,
                    discounts: 0,
                    allocatedExpenses: 150.00,
                    nonRecoverableTaxes: 0,
                ),
            ],
        ));

        $receiptService->postReceipt($receipt->id, $admin->id);

        $today = Carbon::parse(app(ApplicationClock::class)->todayInBusinessTz());

        $standard = PriceList::create(['code' => 'STD-TEST', 'name' => 'Estándar Prueba', 'priority' => 0, 'is_active' => true]);
        $event = PriceList::create(['code' => 'EVENT-TEST', 'name' => 'Evento Prueba', 'priority' => 0, 'is_active' => true]);
        $promo = PriceList::create(['code' => 'PROMO-TEST', 'name' => 'Promoción Prueba', 'priority' => 10, 'is_active' => true]);

        PriceListAssignment::create([
            'price_list_id' => $standard->id,
            'branch_id' => $branch->id,
            'operating_unit_id' => null,
            'effective_from' => $today->copy()->subDays(30)->toDateString(),
            'is_active' => true,
        ]);

        PriceListAssignment::create([
            'price_list_id' => $event->id,
            'branch_id' => $branch->id,
            'operating_unit_id' => $eventUnit->id,
            'effective_from' => $today->copy()->subDay()->toDateString(),
            'effective_to' => $today->copy()->addDays(30)->toDateString(),
            'is_active' => true,
        ]);

        PriceListAssignment::create([
            'price_list_id' => $promo->id,
            'branch_id' => $branch->id,
            'operating_unit_id' => null,
            'effective_from' => $today->toDateString(),
            'effective_to' => $today->copy()->addDays(6)->toDateString(),
            'is_active' => true,
        ]);

        VariantPrice::create([
            'item_variant_id' => $cokeVariantId,
            'price_list_id' => $standard->id,
            'price' => 22.00,
            'effective_from' => $today->copy()->subDays(30)->toDateString(),
            'is_active' => true,
        ]);

        VariantPrice::create([
            'item_variant_id' => $cokeVariantId,
            'price_list_id' => $event->id,
            'price' => 30.00,
            'effective_from' => $today->copy()->subDay()->toDateString(),
            'effective_to' => $today->copy()->addDays(30)->toDateString(),
            'is_active' => true,
        ]);

        VariantPrice::create([
            'item_variant_id' => $buldakVariantId,
            'price_list_id' => $standard->id,
            'price' => 35.00,
            'effective_from' => $today->copy()->subDays(30)->toDateString(),
            'is_active' => true,
        ]);

        VariantPrice::create([
            'item_variant_id' => $buldakVariantId,
            'price_list_id' => $promo->id,
            'price' => 28.00,
            'effective_from' => $today->toDateString(),
            'effective_to' => $today->copy()->addDays(6)->toDateString(),
            'is_active' => true,
        ]);

        $this->command?->info('✓ PurchasingTestSeeder: 2 suppliers, 1 posted receipt, 3 price lists seeded');
    }
}
