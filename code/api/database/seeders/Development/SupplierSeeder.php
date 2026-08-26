<?php

declare(strict_types=1);

namespace Database\Seeders\Development;

use App\Models\ItemVariant;
use App\Models\PurchasePresentationTemplate;
use App\Models\Supplier;
use App\Models\SupplierOffering;
use App\Models\VariantPurchasePresentation;
use Database\Seeders\Base\RepeatableSeeder;
use Database\Seeders\Traits\RestoresTrashedOnUpsert;

/**
 * Believable Suppliers quoting existing Development Product Purchase
 * Presentations, including two Suppliers quoting the exact same
 * Presentation at different prices (#437's "different presentation
 * quotations" Acceptance Criterion). Supplier/offering data configured in
 * config/seeders.php under development_suppliers / development_supplier_offerings.
 *
 * No Receipt/Stock/price data is seeded here — see
 * Development/PurchaseReceiptSeeder and Development/PricingSeeder.
 *
 * Depends on Development/ProductCatalogSeeder and
 * Development/PurchasePresentationTemplateSeeder having already run.
 */
class SupplierSeeder extends RepeatableSeeder
{
    use RestoresTrashedOnUpsert;

    public function run(): void
    {
        $supplierIds = [];

        foreach (config('seeders.development_suppliers', []) as $tuple) {
            $supplier = $this->upsertRestoringTrashed(
                Supplier::class,
                ['code' => $tuple['code']],
                [
                    'name' => $tuple['name'],
                    'contact_name' => $tuple['contact_name'],
                    'email' => $tuple['email'],
                    'phone' => $tuple['phone'],
                    'is_active' => $tuple['is_active'],
                ],
            );

            $supplierIds[$tuple['code']] = $supplier->id;
        }

        $offeringCount = 0;

        foreach (config('seeders.development_supplier_offerings', []) as $tuple) {
            $supplierId = $supplierIds[$tuple['supplier']] ?? null;
            $variantId = ItemVariant::where('code', $tuple['variant'])->value('id');
            $templateId = PurchasePresentationTemplate::where('code', $tuple['template'])->value('id');

            if (! $supplierId || ! $variantId || ! $templateId) {
                $this->command->warn("⚠️  Supplier '{$tuple['supplier']}', Variant '{$tuple['variant']}' or Template '{$tuple['template']}' not found. Skipping offering.");

                continue;
            }

            $presentationId = VariantPurchasePresentation::where('item_variant_id', $variantId)
                ->where('template_id', $templateId)
                ->value('id');

            if (! $presentationId) {
                $this->command->warn("⚠️  No Purchase Presentation for Variant '{$tuple['variant']}' / Template '{$tuple['template']}'. Skipping offering.");

                continue;
            }

            $this->upsertRestoringTrashed(
                SupplierOffering::class,
                ['supplier_id' => $supplierId, 'variant_purchase_presentation_id' => $presentationId],
                [
                    'supplier_code' => $tuple['supplier_code'],
                    'quoted_price' => $tuple['quoted_price'],
                    'currency' => $tuple['currency'] ?? 'MXN',
                    'valid_from' => null,
                    'valid_until' => null,
                    'minimum_order_quantity' => $tuple['minimum_order_quantity'],
                    'lead_time_days' => $tuple['lead_time_days'],
                    'is_active' => true,
                ],
            );

            $offeringCount++;
        }

        $this->command->info('✓ Suppliers seeded: '.count($supplierIds)." ({$offeringCount} offerings)");
    }
}
