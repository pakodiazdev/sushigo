<?php

declare(strict_types=1);

namespace Database\Seeders\Development;

use App\DataTransferObjects\Inventory\ReceiptLineData;
use App\DataTransferObjects\Inventory\SaveReceiptData;
use App\Models\InventoryLocation;
use App\Models\ItemVariant;
use App\Models\OperatingUnit;
use App\Models\PurchasePresentationTemplate;
use App\Models\Receipt;
use App\Models\Supplier;
use App\Models\SupplierOffering;
use App\Models\User;
use App\Models\VariantPurchasePresentation;
use App\Services\Inventory\ReceiptService;
use App\Support\Clock\ApplicationClock;
use Database\Seeders\Base\RepeatableSeeder;

/**
 * Demonstrates package normalization, promotional bonus packages and an
 * allocated freight expense driving effective acquisition cost and the
 * destination Stock's weighted-average cost — see #432/#434 and
 * doc/architecture/inventory-architecture.en.md. Receipt/line data
 * configured in config/seeders.php under development_purchase_receipt.
 *
 * Posting a Receipt mutates Stock via App\Services\Inventory\ReceiptService,
 * which is not naturally idempotent — re-posting the same Receipt would
 * double stock. Guarded by checking the configured `reference` first, so
 * re-running this seeder (e.g. via --force) is a no-op once already posted,
 * satisfying #437's "repeatable restore-on-reseed behavior" the same way
 * upsertRestoringTrashed does for simpler catalog seeders.
 *
 * Depends on Development/SupplierSeeder, Development/ProductCatalogSeeder,
 * BranchSeeder, OperatingUnitSeeder, InventoryLocationSeeder and UserSeeder
 * having already run.
 */
class PurchaseReceiptSeeder extends RepeatableSeeder
{
    public function run(): void
    {
        $config = config('seeders.development_purchase_receipt');

        if (! $config) {
            $this->command->warn('⚠️  No development_purchase_receipt configured. Skipping.');

            return;
        }

        if ($this->receiptAlreadySeeded($config)) {
            return;
        }

        $context = $this->resolveContext($config);
        $lines = $context ? $this->resolveLines($config) : [];

        if (! $context || empty($lines)) {
            return;
        }

        [$supplier, $destination, $actingUser] = $context;

        $receiptService = app(ReceiptService::class);

        $receipt = $receiptService->createDraft(new SaveReceiptData(
            supplierId: $supplier->id,
            destinationLocationId: $destination->id,
            reference: $config['reference'],
            receiptDate: app(ApplicationClock::class)->todayInBusinessTz(),
            notes: $config['notes'],
            actingUserId: $actingUser->id,
            lines: $lines,
        ));

        $receiptService->postReceipt($receipt->id, $actingUser->id);

        $this->command->info("✓ Purchase receipt '{$config['reference']}' seeded and posted (".count($lines).' lines)');
    }

    private function receiptAlreadySeeded(array $config): bool
    {
        if (Receipt::withTrashed()->where('reference', $config['reference'])->exists()) {
            $this->command->info("ℹ️  Receipt '{$config['reference']}' already seeded. Skipping.");

            return true;
        }

        return false;
    }

    /**
     * @return array{0: Supplier, 1: InventoryLocation, 2: User}|null
     */
    private function resolveContext(array $config): ?array
    {
        $supplier = Supplier::where('code', $config['supplier'])->first();
        $mainUnit = OperatingUnit::where('type', OperatingUnit::TYPE_BRANCH_MAIN)->first();
        $destination = $mainUnit
            ? InventoryLocation::where('operating_unit_id', $mainUnit->id)->where('type', $config['location_type'])->first()
            : null;
        $actingUser = User::where('email', 'admin@sushigo.com')->first();

        if (! $supplier || ! $destination || ! $actingUser) {
            $this->command->warn('⚠️  Supplier, destination InventoryLocation or acting User not found. Skipping purchase receipt.');

            return null;
        }

        return [$supplier, $destination, $actingUser];
    }

    /**
     * @return ReceiptLineData[]
     */
    private function resolveLines(array $config): array
    {
        $lines = [];

        foreach ($config['lines'] as $lineConfig) {
            $variantId = ItemVariant::where('code', $lineConfig['variant'])->value('id');
            $templateId = PurchasePresentationTemplate::where('code', $lineConfig['template'])->value('id');
            $presentationId = ($variantId && $templateId)
                ? VariantPurchasePresentation::where('item_variant_id', $variantId)->where('template_id', $templateId)->value('id')
                : null;

            if (! $presentationId) {
                $this->command->warn("⚠️  No Purchase Presentation for Variant '{$lineConfig['variant']}' / Template '{$lineConfig['template']}'. Skipping line.");

                continue;
            }

            $offeringSupplierId = Supplier::where('code', $lineConfig['offering_supplier'])->value('id');
            $offeringId = $offeringSupplierId
                ? SupplierOffering::where('supplier_id', $offeringSupplierId)->where('variant_purchase_presentation_id', $presentationId)->value('id')
                : null;

            $lines[] = new ReceiptLineData(
                variantPurchasePresentationId: $presentationId,
                supplierOfferingId: $offeringId,
                orderedPackages: $lineConfig['ordered_packages'],
                receivedPackages: $lineConfig['received_packages'],
                bonusPackages: $lineConfig['bonus_packages'],
                grossAmount: $lineConfig['gross_amount'],
                discounts: $lineConfig['discounts'],
                allocatedExpenses: $lineConfig['allocated_expenses'],
                nonRecoverableTaxes: $lineConfig['non_recoverable_taxes'],
            );
        }

        if (empty($lines)) {
            $this->command->warn('⚠️  No valid lines resolved. Skipping purchase receipt.');
        }

        return $lines;
    }
}
