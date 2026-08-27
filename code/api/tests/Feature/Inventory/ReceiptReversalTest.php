<?php

namespace Tests\Feature\Inventory;

use App\Models\InventoryLocation;
use App\Models\Receipt;
use App\Models\Stock;
use App\Models\StockMovement;
use App\Services\Inventory\StockMovementReverser;
use PHPUnit\Framework\Attributes\Test;

class ReceiptReversalTest extends InventoryTestCase
{
    private function createPostedReceipt(float $receivedPackages = 10, ?InventoryLocation $destination = null): array
    {
        $item = $this->createItem();
        $variant = $this->createItemVariant($item);
        $template = $this->createPurchasePresentationTemplate(); // BOX x24
        $presentation = $this->createVariantPurchasePresentation($variant, $template);
        $supplier = $this->createSupplier();

        $payload = [
            'supplier_id' => $supplier->public_id,
            'destination_location_id' => ($destination ?? $this->location)->public_id,
            'receipt_date' => '2026-08-25',
            'lines' => [[
                'variant_purchase_presentation_id' => $presentation->public_id,
                'ordered_packages' => $receivedPackages,
                'received_packages' => $receivedPackages,
                'bonus_packages' => 0,
                'gross_amount' => 480 * $receivedPackages,
                'discounts' => 0,
                'allocated_expenses' => 0,
                'non_recoverable_taxes' => 0,
            ]],
        ];

        $id = $this->postJson('/api/v1/inventory/receipts', $payload)->json('data.id');
        $this->postJson("/api/v1/inventory/receipts/{$id}/post")->assertOk();

        return ['id' => $id, 'variant' => $variant];
    }

    #[Test]
    public function it_reverses_a_posted_receipt_and_decreases_stock(): void
    {
        ['id' => $id, 'variant' => $variant] = $this->createPostedReceipt();

        $response = $this->postJson("/api/v1/inventory/receipts/{$id}/reverse", ['reason' => 'Damaged goods']);

        $response->assertOk()
            ->assertJsonPath('data.status', 'REVERSED')
            ->assertJsonPath('data.reversal_reason', 'Damaged goods');

        $stock = Stock::where('inventory_location_id', $this->location->id)
            ->where('item_variant_id', $variant->id)
            ->first();

        $this->assertEquals(0.0, (float) $stock->on_hand);

        $reversalMovement = StockMovement::where('related_type', Receipt::class)
            ->where('reason', StockMovement::REASON_PURCHASE_RECEIPT_REVERSAL)
            ->where('item_variant_id', $variant->id)
            ->first();

        $this->assertNotNull($reversalMovement);
        $this->assertEquals(240.0, (float) $reversalMovement->qty);
    }

    #[Test]
    public function it_blocks_reversal_once_stock_has_been_consumed_below_the_received_amount(): void
    {
        ['id' => $id, 'variant' => $variant] = $this->createPostedReceipt();

        $stock = Stock::where('inventory_location_id', $this->location->id)
            ->where('item_variant_id', $variant->id)
            ->first();
        // Received 240 base units; consume all but 5 — leaves less than the
        // receipt's own 240 units, so reversing it would drive on_hand negative.
        $stock->decreaseOnHand(235);

        $this->postJson("/api/v1/inventory/receipts/{$id}/reverse")->assertStatus(409);

        $this->assertEquals(5.0, (float) $stock->fresh()->on_hand);
    }

    #[Test]
    public function it_links_the_reversal_movement_to_the_original_and_flips_it_to_reversed(): void
    {
        ['id' => $id, 'variant' => $variant] = $this->createPostedReceipt();

        $original = StockMovement::where('related_type', Receipt::class)
            ->where('reason', StockMovement::REASON_PURCHASE_RECEIPT)
            ->where('item_variant_id', $variant->id)
            ->firstOrFail();

        $this->assertTrue($original->isPosted());

        $this->postJson("/api/v1/inventory/receipts/{$id}/reverse", ['reason' => 'Wrong supplier'])
            ->assertOk();

        $original->refresh();
        $this->assertTrue($original->isReversed());
        $this->assertNotNull($original->reversed_at);
        $this->assertSame($this->user->id, $original->reversed_by_user_id);
        $this->assertSame('Wrong supplier', $original->reversal_reason);

        $compensating = StockMovement::where('reason', StockMovement::REASON_PURCHASE_RECEIPT_REVERSAL)
            ->where('item_variant_id', $variant->id)
            ->firstOrFail();

        $this->assertSame($original->id, $compensating->reverses_stock_movement_id);
        $this->assertSame($compensating->id, $original->reversal->id);
    }

    #[Test]
    public function it_rejects_reversing_a_receipt_whose_movement_was_already_reversed_elsewhere(): void
    {
        ['id' => $id, 'variant' => $variant] = $this->createPostedReceipt();

        $original = StockMovement::where('related_type', Receipt::class)
            ->where('reason', StockMovement::REASON_PURCHASE_RECEIPT)
            ->where('item_variant_id', $variant->id)
            ->firstOrFail();

        // Reverse the receipt's stock movement through the shared reverser,
        // leaving the Receipt row itself still POSTED.
        app(StockMovementReverser::class)->reverse($original, $this->user->id, 'corrected via ledger');

        $onHandAfterLedgerReversal = (float) Stock::where('inventory_location_id', $this->location->id)
            ->where('item_variant_id', $variant->id)
            ->value('on_hand');

        // The receipt endpoint must now refuse rather than subtract the
        // quantity a second time from unrelated stock.
        $this->postJson("/api/v1/inventory/receipts/{$id}/reverse")->assertStatus(409);

        $this->assertEquals(
            $onHandAfterLedgerReversal,
            (float) Stock::where('inventory_location_id', $this->location->id)
                ->where('item_variant_id', $variant->id)
                ->value('on_hand')
        );
        $this->assertTrue(Receipt::where('public_id', $id)->firstOrFail()->isPosted());
    }

    #[Test]
    public function it_rejects_reversing_a_draft_receipt(): void
    {
        $item = $this->createItem();
        $variant = $this->createItemVariant($item);
        $template = $this->createPurchasePresentationTemplate();
        $presentation = $this->createVariantPurchasePresentation($variant, $template);
        $supplier = $this->createSupplier();

        $id = $this->postJson('/api/v1/inventory/receipts', [
            'supplier_id' => $supplier->public_id,
            'destination_location_id' => $this->location->public_id,
            'receipt_date' => '2026-08-25',
            'lines' => [[
                'variant_purchase_presentation_id' => $presentation->public_id,
                'received_packages' => 1,
                'gross_amount' => 480,
            ]],
        ])->json('data.id');

        $this->postJson("/api/v1/inventory/receipts/{$id}/reverse")->assertStatus(409);
    }

    #[Test]
    public function it_rejects_reversing_an_already_reversed_receipt(): void
    {
        ['id' => $id] = $this->createPostedReceipt();

        $this->postJson("/api/v1/inventory/receipts/{$id}/reverse")->assertOk();
        $this->postJson("/api/v1/inventory/receipts/{$id}/reverse")->assertStatus(409);
    }

    #[Test]
    public function reversal_requires_receipts_manage_permission(): void
    {
        ['id' => $id] = $this->createPostedReceipt();
        $this->user->removeRole('inventory-manager');

        $this->postJson("/api/v1/inventory/receipts/{$id}/reverse")->assertForbidden();
    }

    #[Test]
    public function it_keeps_the_destination_location_on_a_reversed_receipt_after_it_is_soft_deleted(): void
    {
        $destination = InventoryLocation::create([
            'operating_unit_id' => $this->operatingUnit->id,
            'name' => 'Reversal Warehouse',
            'type' => 'MAIN',
            'priority' => 50,
            'is_active' => true,
        ]);

        ['id' => $id] = $this->createPostedReceipt(destination: $destination);
        $this->postJson("/api/v1/inventory/receipts/{$id}/reverse")->assertOk();

        // Stock is back to 0, so the location's own delete endpoint would permit this.
        $destination->delete();

        $this->getJson("/api/v1/inventory/receipts/{$id}")
            ->assertOk()
            ->assertJsonPath('data.destination_location.name', 'Reversal Warehouse');
    }

    #[Test]
    public function it_rejects_reversal_when_the_variant_was_soft_deleted_after_posting(): void
    {
        ['id' => $id, 'variant' => $variant] = $this->createPostedReceipt();

        $variant->delete();

        $this->postJson("/api/v1/inventory/receipts/{$id}/reverse")->assertStatus(409);
    }
}
