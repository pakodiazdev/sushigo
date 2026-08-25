<?php

namespace Tests\Feature\Inventory;

use App\Models\Receipt;
use App\Models\SupplierOffering;
use PHPUnit\Framework\Attributes\Test;

class ReceiptCrudTest extends InventoryTestCase
{
    private function validPayload(): array
    {
        $item = $this->createItem();
        $variant = $this->createItemVariant($item);
        $template = $this->createPurchasePresentationTemplate();
        $presentation = $this->createVariantPurchasePresentation($variant, $template);
        $supplier = $this->createSupplier();

        return [
            'supplier' => $supplier,
            'presentation' => $presentation,
            'payload' => [
                'supplier_id' => $supplier->public_id,
                'destination_location_id' => $this->location->public_id,
                'reference' => 'FAC-0001',
                'receipt_date' => '2026-08-25',
                'notes' => 'Test receipt',
                'lines' => [
                    [
                        'variant_purchase_presentation_id' => $presentation->public_id,
                        'ordered_packages' => 10,
                        'received_packages' => 10,
                        'bonus_packages' => 0,
                        'gross_amount' => 4800,
                        'discounts' => 0,
                        'allocated_expenses' => 150,
                        'non_recoverable_taxes' => 0,
                    ],
                ],
            ],
        ];
    }

    #[Test]
    public function it_creates_a_draft_receipt_with_computed_line_totals(): void
    {
        ['payload' => $payload] = $this->validPayload();

        $response = $this->postJson('/api/v1/inventory/receipts', $payload);

        $response->assertCreated()
            ->assertJsonPath('data.status', 'DRAFT')
            ->assertJsonPath('data.reference', 'FAC-0001')
            ->assertJsonPath('data.lines.0.base_units_received', 240)
            ->assertJsonPath('data.lines.0.net_acquisition_amount', 4950)
            ->assertJsonPath('data.lines.0.effective_unit_cost', 20.625)
            ->assertJsonPath('data.lines.0.presentation_factor', 24);

        $this->assertIsString($response->json('data.id'));
        $this->assertDatabaseHas('receipts', ['reference' => 'FAC-0001', 'status' => Receipt::STATUS_DRAFT]);
    }

    #[Test]
    public function it_rejects_bonus_packages_greater_than_received_packages(): void
    {
        ['payload' => $payload] = $this->validPayload();
        $payload['lines'][0]['bonus_packages'] = 20;

        $this->postJson('/api/v1/inventory/receipts', $payload)
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['lines.0.bonus_packages']);
    }

    #[Test]
    public function it_rejects_a_receipt_with_no_lines(): void
    {
        ['payload' => $payload] = $this->validPayload();
        $payload['lines'] = [];

        $this->postJson('/api/v1/inventory/receipts', $payload)
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['lines']);
    }

    #[Test]
    public function it_rejects_non_positive_received_packages(): void
    {
        ['payload' => $payload] = $this->validPayload();
        $payload['lines'][0]['received_packages'] = 0;

        $this->postJson('/api/v1/inventory/receipts', $payload)
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['lines.0.received_packages']);
    }

    #[Test]
    public function it_requires_receipts_permissions(): void
    {
        ['payload' => $payload] = $this->validPayload();
        $this->user->removeRole('inventory-manager');

        $this->getJson('/api/v1/inventory/receipts')->assertForbidden();
        $this->postJson('/api/v1/inventory/receipts', $payload)->assertForbidden();
    }

    #[Test]
    public function it_lists_and_filters_receipts_by_status_and_supplier(): void
    {
        ['payload' => $payloadA, 'supplier' => $supplierA] = $this->validPayload();
        ['payload' => $payloadB] = $this->validPayload();

        $this->postJson('/api/v1/inventory/receipts', $payloadA)->assertCreated();
        $this->postJson('/api/v1/inventory/receipts', $payloadB)->assertCreated();

        $this->getJson('/api/v1/inventory/receipts?supplier_id='.$supplierA->public_id)
            ->assertOk()
            ->assertJsonCount(1, 'data');

        $this->getJson('/api/v1/inventory/receipts?status=DRAFT')
            ->assertOk()
            ->assertJsonCount(2, 'data');
    }

    #[Test]
    public function it_shows_a_receipt(): void
    {
        ['payload' => $payload] = $this->validPayload();
        $id = $this->postJson('/api/v1/inventory/receipts', $payload)->json('data.id');

        $this->getJson("/api/v1/inventory/receipts/{$id}")
            ->assertOk()
            ->assertJsonPath('data.id', $id);
    }

    #[Test]
    public function it_updates_a_draft_receipt_recomputing_line_totals(): void
    {
        ['payload' => $payload] = $this->validPayload();
        $id = $this->postJson('/api/v1/inventory/receipts', $payload)->json('data.id');

        $payload['lines'][0]['received_packages'] = 12;
        $payload['reference'] = 'FAC-0002';

        $response = $this->putJson("/api/v1/inventory/receipts/{$id}", $payload);

        $response->assertOk()
            ->assertJsonPath('data.reference', 'FAC-0002')
            ->assertJsonPath('data.lines.0.base_units_received', 288);
    }

    #[Test]
    public function it_deletes_a_draft_receipt(): void
    {
        ['payload' => $payload] = $this->validPayload();
        $id = $this->postJson('/api/v1/inventory/receipts', $payload)->json('data.id');

        $this->deleteJson("/api/v1/inventory/receipts/{$id}")->assertNoContent();

        $this->getJson("/api/v1/inventory/receipts/{$id}")->assertNotFound();
    }

    #[Test]
    public function it_rejects_updating_or_deleting_a_posted_receipt(): void
    {
        ['payload' => $payload] = $this->validPayload();
        $id = $this->postJson('/api/v1/inventory/receipts', $payload)->json('data.id');
        $this->postJson("/api/v1/inventory/receipts/{$id}/post")->assertOk();

        $this->putJson("/api/v1/inventory/receipts/{$id}", $payload)->assertStatus(409);
        $this->deleteJson("/api/v1/inventory/receipts/{$id}")->assertStatus(409);
    }

    #[Test]
    public function it_rejects_discounts_that_would_make_the_net_acquisition_amount_negative(): void
    {
        ['payload' => $payload] = $this->validPayload();
        // gross 4800 + expenses 150 = 4950; a 5000 discount drives net negative.
        $payload['lines'][0]['discounts'] = 5000;

        $this->postJson('/api/v1/inventory/receipts', $payload)
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['lines.0.discounts']);
    }

    #[Test]
    public function it_rejects_a_soft_deleted_supplier(): void
    {
        ['payload' => $payload] = $this->validPayload();
        $trashedSupplier = $this->createSupplier();
        $trashedSupplier->delete();
        $payload['supplier_id'] = $trashedSupplier->public_id;

        $this->postJson('/api/v1/inventory/receipts', $payload)
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['supplier_id']);
    }

    #[Test]
    public function it_rejects_a_soft_deleted_destination_location(): void
    {
        ['payload' => $payload] = $this->validPayload();
        $this->location->delete();

        $this->postJson('/api/v1/inventory/receipts', $payload)
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['destination_location_id']);
    }

    #[Test]
    public function it_rejects_a_supplier_offering_that_belongs_to_a_different_supplier(): void
    {
        ['payload' => $payload, 'presentation' => $presentation] = $this->validPayload();
        $otherSupplier = $this->createSupplier();
        $offering = SupplierOffering::create([
            'supplier_id' => $otherSupplier->id,
            'variant_purchase_presentation_id' => $presentation->id,
            'supplier_code' => 'CODE-'.uniqid(),
            'quoted_price' => 100,
            'currency' => 'MXN',
            'minimum_order_quantity' => 1,
            'is_active' => true,
        ]);
        $payload['lines'][0]['supplier_offering_id'] = $offering->public_id;

        $this->postJson('/api/v1/inventory/receipts', $payload)
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['lines.0.supplier_offering_id']);
    }

    #[Test]
    public function it_returns_spanish_validation_messages(): void
    {
        ['payload' => $payload] = $this->validPayload();
        $payload['supplier_id'] = 'not-a-real-public-id';
        unset($payload['receipt_date']);

        $response = $this->postJson('/api/v1/inventory/receipts', $payload)->assertUnprocessable();

        $response->assertJsonPath('errors.supplier_id.0', 'El proveedor seleccionado no existe.')
            ->assertJsonPath('errors.receipt_date.0', 'La fecha de recepción es requerida.');
    }
}
