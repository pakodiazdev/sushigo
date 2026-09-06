<?php

namespace Tests\Feature\Inventory;

use App\Models\InventoryLocation;
use App\Models\Receipt;
use App\Models\Stock;
use App\Models\StockMovement;
use App\Models\VariantLocationAssignment;
use PHPUnit\Framework\Attributes\Test;

/**
 * #572 — a confirmed Purchase Receipt is the auditable boundary that places
 * supplier inventory into a *valid receiving* Location:
 *
 *  - saving a draft must reject an inactive / non-receiving destination with a
 *    field-level 422 (the `exists` rule + Operating Unit scope already reject
 *    soft-deleted / unknown / cross-unit ones);
 *  - a DRAFT never touches Stock, cost, movements, or assignments;
 *  - posting re-checks the destination under lock (409 + full rollback if it
 *    became ineligible while the Receipt was a draft) and idempotently ensures
 *    each received Variant's assignment at the destination;
 *  - reversal compensates Stock/movements but leaves the assignment in place.
 */
class ReceiptDestinationEligibilityTest extends InventoryTestCase
{
    /** @return array{payload: array<string, mixed>, variant: \App\Models\ItemVariant} */
    private function draftPayload(array $headerOverrides = []): array
    {
        $item = $this->createItem();
        $variant = $this->createItemVariant($item);
        $template = $this->createPurchasePresentationTemplate(); // BOX x24
        $presentation = $this->createVariantPurchasePresentation($variant, $template);
        $supplier = $this->createSupplier();

        return [
            'variant' => $variant,
            'payload' => array_merge([
                'supplier_id' => $supplier->public_id,
                'destination_location_id' => $this->location->public_id,
                'reference' => 'FAC-ELIG-1',
                'receipt_date' => '2026-08-25',
                'lines' => [[
                    'variant_purchase_presentation_id' => $presentation->public_id,
                    'received_packages' => 1,
                    'gross_amount' => 480,
                ]],
            ], $headerOverrides),
        ];
    }

    private function receivingLocation(array $overrides = []): InventoryLocation
    {
        return InventoryLocation::create(array_merge([
            'operating_unit_id' => $this->operatingUnit->id,
            'name' => 'Extra Warehouse '.uniqid(),
            'type' => 'MAIN',
            'priority' => 40,
            'is_active' => true,
            'can_receive_purchases' => true,
        ], $overrides));
    }

    private function assertNoInventoryEffect(): void
    {
        $this->assertSame(0, Stock::count(), 'no Stock row was written');
        $this->assertSame(0, StockMovement::count(), 'no StockMovement was written');
        $this->assertSame(0, VariantLocationAssignment::count(), 'no assignment was written');
    }

    #[Test]
    public function saving_a_draft_into_an_inactive_location_is_a_field_level_422(): void
    {
        $inactive = $this->receivingLocation(['is_active' => false]);
        ['payload' => $payload] = $this->draftPayload(['destination_location_id' => $inactive->public_id]);

        $this->postJson('/api/v1/inventory/receipts', $payload)
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['destination_location_id']);

        $this->assertSame(0, Receipt::count());
    }

    #[Test]
    public function saving_a_draft_into_a_non_receiving_location_is_a_field_level_422(): void
    {
        $storage = $this->receivingLocation(['can_receive_purchases' => false]);
        ['payload' => $payload] = $this->draftPayload(['destination_location_id' => $storage->public_id]);

        $this->postJson('/api/v1/inventory/receipts', $payload)
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['destination_location_id']);
    }

    #[Test]
    public function saving_a_draft_into_a_soft_deleted_or_unknown_location_is_a_422(): void
    {
        $deleted = $this->receivingLocation();
        $deleted->delete();

        ['payload' => $payload] = $this->draftPayload(['destination_location_id' => $deleted->public_id]);
        $this->postJson('/api/v1/inventory/receipts', $payload)
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['destination_location_id']);

        ['payload' => $unknown] = $this->draftPayload(['destination_location_id' => '01JAAAAAAAAAAAAAAAAAAAAAAA']);
        $this->postJson('/api/v1/inventory/receipts', $unknown)
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['destination_location_id']);
    }

    #[Test]
    public function updating_a_draft_to_point_at_a_non_receiving_location_is_a_422(): void
    {
        ['payload' => $payload] = $this->draftPayload();
        $id = $this->postJson('/api/v1/inventory/receipts', $payload)->assertCreated()->json('data.id');

        $storage = $this->receivingLocation(['can_receive_purchases' => false]);
        $payload['destination_location_id'] = $storage->public_id;

        $this->putJson("/api/v1/inventory/receipts/{$id}", $payload)
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['destination_location_id']);

        // The draft still points at the original, valid destination.
        $this->assertSame(
            $this->location->id,
            Receipt::where('public_id', $id)->value('destination_location_id')
        );
    }

    #[Test]
    public function a_draft_create_update_and_delete_never_touch_stock_cost_movements_or_assignments(): void
    {
        ['payload' => $payload] = $this->draftPayload();

        $id = $this->postJson('/api/v1/inventory/receipts', $payload)->assertCreated()->json('data.id');
        $this->assertNoInventoryEffect();

        $payload['lines'][0]['received_packages'] = 3;
        $this->putJson("/api/v1/inventory/receipts/{$id}", $payload)->assertOk();
        $this->assertNoInventoryEffect();

        $this->deleteJson("/api/v1/inventory/receipts/{$id}")->assertNoContent();
        $this->assertNoInventoryEffect();
    }

    #[Test]
    public function the_detail_resource_exposes_the_destination_context(): void
    {
        ['payload' => $payload] = $this->draftPayload();
        $id = $this->postJson('/api/v1/inventory/receipts', $payload)->assertCreated()->json('data.id');

        $this->getJson("/api/v1/inventory/receipts/{$id}")
            ->assertOk()
            ->assertJsonPath('data.destination_location.type', 'MAIN')
            ->assertJsonPath('data.destination_location.is_active', true)
            ->assertJsonPath('data.destination_location.can_receive_purchases', true)
            ->assertJsonPath('data.destination_location.operating_unit.id', $this->operatingUnit->id)
            ->assertJsonPath('data.destination_location.operating_unit.name', $this->operatingUnit->name);
    }

    #[Test]
    public function posting_is_rejected_with_409_when_the_destination_was_deactivated_after_the_draft(): void
    {
        ['payload' => $payload] = $this->draftPayload();
        $id = $this->postJson('/api/v1/inventory/receipts', $payload)->assertCreated()->json('data.id');

        $this->location->update(['is_active' => false]);

        $this->postJson("/api/v1/inventory/receipts/{$id}/post")->assertStatus(409);

        $this->assertSame(Receipt::STATUS_DRAFT, Receipt::where('public_id', $id)->value('status'));
        $this->assertNoInventoryEffect();
    }

    #[Test]
    public function posting_is_rejected_with_409_when_can_receive_purchases_was_cleared_after_the_draft(): void
    {
        ['payload' => $payload] = $this->draftPayload();
        $id = $this->postJson('/api/v1/inventory/receipts', $payload)->assertCreated()->json('data.id');

        $this->location->update(['can_receive_purchases' => false]);

        $this->postJson("/api/v1/inventory/receipts/{$id}/post")->assertStatus(409);

        $this->assertSame(Receipt::STATUS_DRAFT, Receipt::where('public_id', $id)->value('status'));
        $this->assertNoInventoryEffect();
    }

    #[Test]
    public function posting_a_valid_receipt_establishes_the_variant_to_location_assignment(): void
    {
        ['payload' => $payload, 'variant' => $variant] = $this->draftPayload();
        $id = $this->postJson('/api/v1/inventory/receipts', $payload)->assertCreated()->json('data.id');

        $this->assertDatabaseMissing('variant_location_assignments', [
            'inventory_location_id' => $this->location->id,
            'item_variant_id' => $variant->id,
        ]);

        $this->postJson("/api/v1/inventory/receipts/{$id}/post")->assertOk();

        $this->assertDatabaseHas('variant_location_assignments', [
            'inventory_location_id' => $this->location->id,
            'item_variant_id' => $variant->id,
            'deleted_at' => null,
        ]);
        $this->assertSame(1, VariantLocationAssignment::where('item_variant_id', $variant->id)->count());
    }

    #[Test]
    public function posting_is_idempotent_against_a_pre_existing_assignment(): void
    {
        ['payload' => $payload, 'variant' => $variant] = $this->draftPayload();
        VariantLocationAssignment::create([
            'inventory_location_id' => $this->location->id,
            'item_variant_id' => $variant->id,
        ]);

        $id = $this->postJson('/api/v1/inventory/receipts', $payload)->assertCreated()->json('data.id');
        $this->postJson("/api/v1/inventory/receipts/{$id}/post")->assertOk();

        $this->assertSame(
            1,
            VariantLocationAssignment::withTrashed()
                ->where('inventory_location_id', $this->location->id)
                ->where('item_variant_id', $variant->id)
                ->count()
        );
    }

    #[Test]
    public function every_line_of_a_multi_line_receipt_gets_its_own_assignment(): void
    {
        $item = $this->createItem();
        $variantA = $this->createItemVariant($item, ['name' => 'Elig Variant A']);
        $variantB = $this->createItemVariant($item, ['name' => 'Elig Variant B']);
        $template = $this->createPurchasePresentationTemplate();
        $presentationA = $this->createVariantPurchasePresentation($variantA, $template);
        $presentationB = $this->createVariantPurchasePresentation($variantB, $template);
        $supplier = $this->createSupplier();

        $id = $this->postJson('/api/v1/inventory/receipts', [
            'supplier_id' => $supplier->public_id,
            'destination_location_id' => $this->location->public_id,
            'receipt_date' => '2026-08-25',
            'lines' => [
                ['variant_purchase_presentation_id' => $presentationA->public_id, 'received_packages' => 1, 'gross_amount' => 240],
                ['variant_purchase_presentation_id' => $presentationB->public_id, 'received_packages' => 2, 'gross_amount' => 480],
            ],
        ])->assertCreated()->json('data.id');

        $this->postJson("/api/v1/inventory/receipts/{$id}/post")->assertOk();

        foreach ([$variantA, $variantB] as $variant) {
            $this->assertDatabaseHas('variant_location_assignments', [
                'inventory_location_id' => $this->location->id,
                'item_variant_id' => $variant->id,
                'deleted_at' => null,
            ]);
        }
    }

    #[Test]
    public function reversing_a_receipt_compensates_stock_but_keeps_the_assignment(): void
    {
        ['payload' => $payload, 'variant' => $variant] = $this->draftPayload();
        $id = $this->postJson('/api/v1/inventory/receipts', $payload)->assertCreated()->json('data.id');
        $this->postJson("/api/v1/inventory/receipts/{$id}/post")->assertOk();
        $this->postJson("/api/v1/inventory/receipts/{$id}/reverse")->assertOk();

        $this->assertEquals(
            0.0,
            (float) Stock::where('inventory_location_id', $this->location->id)
                ->where('item_variant_id', $variant->id)
                ->value('on_hand')
        );

        $this->assertDatabaseHas('variant_location_assignments', [
            'inventory_location_id' => $this->location->id,
            'item_variant_id' => $variant->id,
            'deleted_at' => null,
        ]);
    }

    #[Test]
    public function a_role_without_receipts_manage_cannot_create_a_draft(): void
    {
        ['payload' => $payload] = $this->draftPayload();
        $this->user->removeRole('inventory-manager');

        $this->postJson('/api/v1/inventory/receipts', $payload)->assertForbidden();
    }
}
