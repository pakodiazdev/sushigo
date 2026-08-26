<?php

namespace Tests\Feature\Inventory;

use App\Models\Supplier;
use App\Models\SupplierOffering;
use App\Models\VariantPurchasePresentation;
use PHPUnit\Framework\Attributes\Test;

class SupplierOfferingCrudTest extends InventoryTestCase
{
    #[Test]
    public function it_creates_an_offering_for_a_variant_purchase_presentation(): void
    {
        [$supplier, $presentation] = $this->supplierAndPresentation();

        $response = $this->postJson("/api/v1/inventory/suppliers/{$supplier->public_id}/offerings", [
            'variant_purchase_presentation_id' => $presentation->public_id,
            'supplier_code' => 'SUP-BOX-24',
            'quoted_price' => '480.2500',
            'currency' => 'mxn',
            'valid_from' => '2026-08-01',
            'valid_until' => '2026-12-31',
            'minimum_order_quantity' => '2.0000',
            'lead_time_days' => 3,
        ]);

        $response->assertCreated()
            ->assertJsonPath('data.supplier.id', $supplier->public_id)
            ->assertJsonPath('data.presentation.id', $presentation->public_id)
            ->assertJsonPath('data.currency', 'MXN')
            ->assertJsonPath('data.quoted_price', 480.25)
            ->assertJsonPath('data.minimum_order_quantity', 2)
            ->assertJsonPath('data.is_active', true);

        $this->assertDatabaseHas('supplier_offerings', [
            'supplier_id' => $supplier->id,
            'variant_purchase_presentation_id' => $presentation->id,
            'supplier_code' => 'SUP-BOX-24',
            'currency' => 'MXN',
        ]);
    }

    #[Test]
    public function it_defaults_currency_to_mxn_when_sent_as_null(): void
    {
        [$supplier, $presentation] = $this->supplierAndPresentation();

        $response = $this->postJson("/api/v1/inventory/suppliers/{$supplier->public_id}/offerings", [
            'variant_purchase_presentation_id' => $presentation->public_id,
            'quoted_price' => 100,
            'currency' => null,
        ]);

        $response->assertCreated()->assertJsonPath('data.currency', 'MXN');
    }

    #[Test]
    public function it_allows_two_suppliers_to_quote_different_prices_for_the_same_presentation(): void
    {
        [$firstSupplier, $presentation] = $this->supplierAndPresentation();
        $secondSupplier = Supplier::create(['code' => 'SECOND', 'name' => 'Second', 'is_active' => true]);

        $this->createOffering($firstSupplier, $presentation, ['quoted_price' => 480]);
        $this->createOffering($secondSupplier, $presentation, ['quoted_price' => 510]);

        $this->assertDatabaseCount('supplier_offerings', 2);
    }

    #[Test]
    public function it_lists_and_filters_supplier_offerings(): void
    {
        [$supplier, $presentation] = $this->supplierAndPresentation();
        $this->createOffering($supplier, $presentation, ['currency' => 'MXN', 'is_active' => true]);

        $otherVariant = $this->createItemVariant($this->createProduct());
        $otherPresentation = $this->createVariantPurchasePresentation(
            $otherVariant,
            $this->createPurchasePresentationTemplate(['compatible_dimension_uom_id' => $otherVariant->uom_id])
        );
        $this->createOffering($supplier, $otherPresentation, ['currency' => 'USD', 'is_active' => false]);

        $this->getJson("/api/v1/inventory/suppliers/{$supplier->public_id}/offerings?is_active=1&currency=mxn")
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.presentation.id', $presentation->public_id);
    }

    #[Test]
    public function it_treats_an_empty_currency_filter_as_absent(): void
    {
        [$supplier, $presentation] = $this->supplierAndPresentation();
        $this->createOffering($supplier, $presentation, ['currency' => 'MXN']);

        $this->getJson("/api/v1/inventory/suppliers/{$supplier->public_id}/offerings?currency=")
            ->assertOk()
            ->assertJsonCount(1, 'data');
    }

    #[Test]
    public function it_updates_and_deactivates_an_offering_without_deleting_it(): void
    {
        [$supplier, $presentation] = $this->supplierAndPresentation();
        $offering = $this->createOffering($supplier, $presentation);

        $this->putJson("/api/v1/inventory/suppliers/{$supplier->public_id}/offerings/{$offering->public_id}", [
            'quoted_price' => '450.0000',
            'is_active' => false,
        ])->assertOk()
            ->assertJsonPath('data.quoted_price', 450)
            ->assertJsonPath('data.is_active', false);

        $this->assertDatabaseHas('supplier_offerings', [
            'id' => $offering->id,
            'is_active' => false,
            'deleted_at' => null,
        ]);
    }

    #[Test]
    public function it_rejects_an_offering_for_an_active_presentation_of_an_inactive_variant(): void
    {
        $supplier = Supplier::create(['code' => 'INACTVAR', 'name' => 'Inactive Variant Supplier', 'is_active' => true]);
        $variant = $this->createItemVariant($this->createProduct(), ['is_active' => false]);
        $template = $this->createPurchasePresentationTemplate([
            'compatible_dimension_uom_id' => $variant->uom_id,
        ]);
        $presentation = $this->createVariantPurchasePresentation($variant, $template);

        $this->postJson("/api/v1/inventory/suppliers/{$supplier->public_id}/offerings", [
            'variant_purchase_presentation_id' => $presentation->public_id,
            'quoted_price' => 100,
            'currency' => 'MXN',
        ])->assertUnprocessable()
            ->assertJsonValidationErrors(['variant_purchase_presentation_id']);
    }

    #[Test]
    public function it_rejects_an_offering_for_an_active_presentation_of_an_inactive_product(): void
    {
        $supplier = Supplier::create(['code' => 'INACTPROD', 'name' => 'Inactive Product Supplier', 'is_active' => true]);
        $product = $this->createProduct(['is_active' => false]);
        $variant = $this->createItemVariant($product);
        $template = $this->createPurchasePresentationTemplate([
            'compatible_dimension_uom_id' => $variant->uom_id,
        ]);
        $presentation = $this->createVariantPurchasePresentation($variant, $template);

        $this->postJson("/api/v1/inventory/suppliers/{$supplier->public_id}/offerings", [
            'variant_purchase_presentation_id' => $presentation->public_id,
            'quoted_price' => 100,
            'currency' => 'MXN',
        ])->assertUnprocessable()
            ->assertJsonValidationErrors(['variant_purchase_presentation_id']);
    }

    #[Test]
    public function it_rejects_duplicate_or_inactive_supplier_presentation_pairs(): void
    {
        [$supplier, $presentation] = $this->supplierAndPresentation();
        $this->createOffering($supplier, $presentation);

        $this->postJson("/api/v1/inventory/suppliers/{$supplier->public_id}/offerings", [
            'variant_purchase_presentation_id' => $presentation->public_id,
            'quoted_price' => 100,
            'currency' => 'MXN',
        ])->assertUnprocessable()
            ->assertJsonValidationErrors(['variant_purchase_presentation_id']);

        $supplier->update(['is_active' => false]);
        $otherVariant = $this->createItemVariant($this->createProduct());
        $otherPresentation = $this->createVariantPurchasePresentation(
            $otherVariant,
            $this->createPurchasePresentationTemplate(['compatible_dimension_uom_id' => $otherVariant->uom_id])
        );

        $this->postJson("/api/v1/inventory/suppliers/{$supplier->public_id}/offerings", [
            'variant_purchase_presentation_id' => $otherPresentation->public_id,
            'quoted_price' => 100,
            'currency' => 'MXN',
        ])->assertUnprocessable()
            ->assertJsonValidationErrors(['supplier']);
    }

    #[Test]
    public function it_validates_commercial_terms(): void
    {
        [$supplier, $presentation] = $this->supplierAndPresentation();

        $this->postJson("/api/v1/inventory/suppliers/{$supplier->public_id}/offerings", [
            'variant_purchase_presentation_id' => $presentation->public_id,
            'quoted_price' => -1,
            'currency' => 'PESO',
            'valid_from' => '2026-09-01',
            'valid_until' => '2026-08-01',
            'minimum_order_quantity' => 0,
            'lead_time_days' => -1,
        ])->assertUnprocessable()
            ->assertJsonValidationErrors([
                'quoted_price',
                'currency',
                'valid_until',
                'minimum_order_quantity',
                'lead_time_days',
            ]);
    }

    #[Test]
    public function it_rejects_commercial_values_beyond_the_decimal_column_precision(): void
    {
        [$supplier, $presentation] = $this->supplierAndPresentation();

        $this->postJson("/api/v1/inventory/suppliers/{$supplier->public_id}/offerings", [
            'variant_purchase_presentation_id' => $presentation->public_id,
            'quoted_price' => '100000000000',
            'currency' => 'MXN',
            'minimum_order_quantity' => '100000000000',
        ])->assertUnprocessable()
            ->assertJsonValidationErrors(['quoted_price', 'minimum_order_quantity']);
    }

    #[Test]
    public function it_rejects_a_lead_time_beyond_the_integer_column_capacity(): void
    {
        [$supplier, $presentation] = $this->supplierAndPresentation();

        $this->postJson("/api/v1/inventory/suppliers/{$supplier->public_id}/offerings", [
            'variant_purchase_presentation_id' => $presentation->public_id,
            'quoted_price' => 100,
            'currency' => 'MXN',
            'lead_time_days' => 999999999999999,
        ])->assertUnprocessable()
            ->assertJsonValidationErrors(['lead_time_days']);
    }

    #[Test]
    public function it_validates_list_filters_instead_of_failing_on_an_invalid_date(): void
    {
        [$supplier] = $this->supplierAndPresentation();

        $this->getJson("/api/v1/inventory/suppliers/{$supplier->public_id}/offerings?valid_on=not-a-date")
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['valid_on']);
    }

    #[Test]
    public function it_can_clear_an_offerings_validity_window(): void
    {
        [$supplier, $presentation] = $this->supplierAndPresentation();
        $offering = $this->createOffering($supplier, $presentation, [
            'valid_from' => '2026-09-01',
            'valid_until' => '2026-09-30',
        ]);

        $this->putJson("/api/v1/inventory/suppliers/{$supplier->public_id}/offerings/{$offering->public_id}", [
            'valid_from' => null,
            'valid_until' => null,
        ])->assertOk()
            ->assertJsonPath('data.valid_from', null)
            ->assertJsonPath('data.valid_until', null);
    }

    #[Test]
    public function it_requires_manage_permission_for_offering_changes(): void
    {
        [$supplier, $presentation] = $this->supplierAndPresentation();
        $this->user->removeRole('inventory-manager');

        $this->postJson("/api/v1/inventory/suppliers/{$supplier->public_id}/offerings", [
            'variant_purchase_presentation_id' => $presentation->public_id,
            'quoted_price' => 100,
            'currency' => 'MXN',
        ])->assertForbidden();
    }

    #[Test]
    public function it_allows_listing_offerings_with_receipts_manage_permission_but_not_suppliers_view(): void
    {
        [$supplier, $presentation] = $this->supplierAndPresentation();
        $this->createOffering($supplier, $presentation, ['is_active' => true]);
        $this->user->removeRole('inventory-manager');
        $this->user->givePermissionTo('receipts.manage');

        $this->getJson("/api/v1/inventory/suppliers/{$supplier->public_id}/offerings")
            ->assertOk()
            ->assertJsonCount(1, 'data');
    }

    #[Test]
    public function it_scopes_offerings_to_the_supplier_in_the_route(): void
    {
        [$supplier, $presentation] = $this->supplierAndPresentation();
        $offering = $this->createOffering($supplier, $presentation);
        $otherSupplier = Supplier::create(['code' => 'OTHER', 'name' => 'Other', 'is_active' => true]);

        $this->getJson("/api/v1/inventory/suppliers/{$otherSupplier->public_id}/offerings/{$offering->public_id}")
            ->assertNotFound();
    }

    #[Test]
    public function it_soft_deletes_an_offering_without_erasing_its_commercial_record(): void
    {
        [$supplier, $presentation] = $this->supplierAndPresentation();
        $offering = $this->createOffering($supplier, $presentation);

        $this->deleteJson("/api/v1/inventory/suppliers/{$supplier->public_id}/offerings/{$offering->public_id}")
            ->assertNoContent();

        $this->assertSoftDeleted('supplier_offerings', [
            'id' => $offering->id,
            'quoted_price' => 100,
        ]);
    }

    /** @return array{Supplier, VariantPurchasePresentation} */
    private function supplierAndPresentation(): array
    {
        $supplier = Supplier::create(['code' => 'PRIMARY', 'name' => 'Primary', 'is_active' => true]);
        $variant = $this->createItemVariant($this->createProduct());
        $template = $this->createPurchasePresentationTemplate([
            'compatible_dimension_uom_id' => $variant->uom_id,
        ]);

        return [$supplier, $this->createVariantPurchasePresentation($variant, $template)];
    }

    private function createOffering(
        Supplier $supplier,
        VariantPurchasePresentation $presentation,
        array $attributes = []
    ): SupplierOffering {
        return SupplierOffering::create(array_merge([
            'supplier_id' => $supplier->id,
            'variant_purchase_presentation_id' => $presentation->id,
            'supplier_code' => 'CODE-'.uniqid(),
            'quoted_price' => 100,
            'currency' => 'MXN',
            'minimum_order_quantity' => 1,
            'lead_time_days' => 2,
            'is_active' => true,
        ], $attributes));
    }
}
