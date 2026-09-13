<?php

namespace Tests\Feature\Inventory;

use App\Models\InventoryLocation;
use App\Models\ItemVariant;
use App\Models\PurchasePresentationTemplate;
use App\Models\Receipt;
use App\Models\Stock;
use App\Models\StockMovement;
use App\Models\Supplier;
use App\Models\VariantLocationAssignment;
use App\Models\VariantPurchasePresentation;
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

    /**
     * A single Variant + purchase presentation + Supplier, reusable across
     * several posted Receipts so their weighted-average cost blends
     * together at the same destination Stock row — needed for every
     * valuation-reconciliation scenario below (#579).
     *
     * @return array{variant: ItemVariant, presentation: VariantPurchasePresentation, template: PurchasePresentationTemplate, supplier: Supplier}
     */
    private function setUpValuationVariant(): array
    {
        $item = $this->createItem();
        $variant = $this->createItemVariant($item);
        $template = $this->createPurchasePresentationTemplate(); // BOX x24
        $presentation = $this->createVariantPurchasePresentation($variant, $template);
        $supplier = $this->createSupplier();

        return compact('variant', 'presentation', 'template', 'supplier');
    }

    /**
     * @param  array{variant: ItemVariant, presentation: VariantPurchasePresentation, supplier: Supplier}  $ctx
     */
    private function postReceiptWithGrossAmount(array $ctx, float $packages, float $grossAmount, ?InventoryLocation $destination = null): string
    {
        $payload = [
            'supplier_id' => $ctx['supplier']->public_id,
            'destination_location_id' => ($destination ?? $this->location)->public_id,
            'receipt_date' => '2026-08-25',
            'lines' => [[
                'variant_purchase_presentation_id' => $ctx['presentation']->public_id,
                'ordered_packages' => $packages,
                'received_packages' => $packages,
                'bonus_packages' => 0,
                'gross_amount' => $grossAmount,
                'discounts' => 0,
                'allocated_expenses' => 0,
                'non_recoverable_taxes' => 0,
            ]],
        ];

        $id = $this->postJson('/api/v1/inventory/receipts', $payload)->json('data.id');
        $this->postJson("/api/v1/inventory/receipts/{$id}/post")->assertOk();

        return $id;
    }

    private function stockFor(ItemVariant $variant, ?InventoryLocation $location = null): Stock
    {
        return Stock::where('inventory_location_id', ($location ?? $this->location)->id)
            ->where('item_variant_id', $variant->id)
            ->firstOrFail();
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
        // #579: value is restored exactly alongside quantity — an emptied
        // Stock row carries no leftover weighted-average cost.
        $this->assertEquals(0.0, (float) $stock->weighted_avg_cost);

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

        // Simulate the movement having been reversed by some other means,
        // leaving the Receipt row itself still POSTED. (Not literally via
        // StockMovementReverser — #579 made that reject PURCHASE_RECEIPT
        // movements outright, precisely because it isn't valuation-aware; a
        // direct status flip is enough to exercise ReceiptService's own
        // already-reversed guard, independent of how that state arose.)
        $original->forceFill(['status' => StockMovement::STATUS_REVERSED, 'reversed_at' => now()])->save();

        $onHandAfterLedgerReversal = (float) Stock::where('inventory_location_id', $this->location->id)
            ->where('item_variant_id', $variant->id)
            ->value('on_hand');

        $wacAfterLedgerReversal = (float) Stock::where('inventory_location_id', $this->location->id)
            ->where('item_variant_id', $variant->id)
            ->value('weighted_avg_cost');

        // The receipt endpoint must now refuse rather than subtract the
        // quantity — or its value — a second time from unrelated stock.
        $this->postJson("/api/v1/inventory/receipts/{$id}/reverse")->assertStatus(409);

        $this->assertEquals(
            $onHandAfterLedgerReversal,
            (float) Stock::where('inventory_location_id', $this->location->id)
                ->where('item_variant_id', $variant->id)
                ->value('on_hand')
        );
        // #579: a rejected double-reversal compensates value at most once too.
        $this->assertEquals(
            $wacAfterLedgerReversal,
            (float) Stock::where('inventory_location_id', $this->location->id)
                ->where('item_variant_id', $variant->id)
                ->value('weighted_avg_cost')
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
            'can_receive_purchases' => true,
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

    // ------------------------------------------------------- Valuation (#579) ---

    #[Test]
    public function it_reconciles_the_value_invariant_when_reversing_the_earlier_of_two_receipts(): void
    {
        $ctx = $this->setUpValuationVariant();

        // 240 base units @ 10 (2,400), then 240 base units @ 20 (4,800):
        // 480 units blended to a weighted average of 15 (value 7,200).
        $this->postReceiptWithGrossAmount($ctx, packages: 10, grossAmount: 2400);
        $secondId = $this->postReceiptWithGrossAmount($ctx, packages: 10, grossAmount: 4800);

        $stock = $this->stockFor($ctx['variant']);
        $this->assertEquals(480.0, (float) $stock->on_hand);
        $this->assertEquals(15.0, (float) $stock->weighted_avg_cost);

        // Reversing the *second* receipt must exactly restore the average
        // before it (10) — the Issue's own risk example — not the "1,500 for
        // 100 units" a blindly-untouched average would leave behind.
        $this->postJson("/api/v1/inventory/receipts/{$secondId}/reverse")->assertOk();

        $stock->refresh();
        $this->assertEquals(240.0, (float) $stock->on_hand);
        $this->assertEquals(10.0, (float) $stock->weighted_avg_cost);

        // The fix also corrects the Existencias read model's own derived
        // `total_value` (on_hand × weighted_avg_cost), which is what
        // valuation reports actually surface (#571).
        $this->getJson("/api/v1/stock/by-variant/{$ctx['variant']->public_id}")
            ->assertOk()
            ->assertJsonPath('data.locations.0.total_value', 2400)
            ->assertJsonPath('data.summary.total_inventory_value', 2400);
    }

    #[Test]
    public function it_reconciles_the_value_invariant_when_reversal_survives_partial_consumption(): void
    {
        $ctx = $this->setUpValuationVariant();

        $firstId = $this->postReceiptWithGrossAmount($ctx, packages: 10, grossAmount: 2400); // 240 @ 10
        $this->postReceiptWithGrossAmount($ctx, packages: 10, grossAmount: 4800); // 240 @ 20

        $stock = $this->stockFor($ctx['variant']);
        $this->assertEquals(480.0, (float) $stock->on_hand);
        $this->assertEquals(15.0, (float) $stock->weighted_avg_cost);

        // Consumption only ever changes quantity, never the average (existing,
        // unrelated behavior) — consume 100 of the 480 blended units.
        $stock->decreaseOnHand(100);
        $this->assertEquals(380.0, (float) $stock->fresh()->on_hand);
        $this->assertEquals(15.0, (float) $stock->fresh()->weighted_avg_cost);

        // Reversing the first receipt (240 @ 10 = 2,400) removes exactly that
        // evidenced contribution: remaining value = 380*15 - 240*10 = 3,300
        // over 140 remaining units = 23.5714.
        $this->postJson("/api/v1/inventory/receipts/{$firstId}/reverse")->assertOk();

        $stock->refresh();
        $this->assertEquals(140.0, (float) $stock->on_hand);
        $this->assertEquals(23.5714, (float) $stock->weighted_avg_cost);
    }

    #[Test]
    public function it_blocks_reversal_when_partial_consumption_leaves_unreconcilable_residual_value(): void
    {
        $ctx = $this->setUpValuationVariant();

        $firstId = $this->postReceiptWithGrossAmount($ctx, packages: 10, grossAmount: 2400); // 240 @ 10
        $this->postReceiptWithGrossAmount($ctx, packages: 10, grossAmount: 4800); // 240 @ 20

        $stock = $this->stockFor($ctx['variant']);

        // Consume exactly the first receipt's own quantity (240 of 480) — the
        // quantity boundary alone would allow reversing the first receipt
        // (240 remain), but doing so would zero on_hand at this Stock row
        // while leaving 240*15 - 240*10 = 1,200 of unattributable value.
        $stock->decreaseOnHand(240);
        $this->assertEquals(240.0, (float) $stock->fresh()->on_hand);

        $onHandBefore = (float) $stock->fresh()->on_hand;
        $wacBefore = (float) $stock->fresh()->weighted_avg_cost;
        $receiptBefore = Receipt::where('public_id', $firstId)->firstOrFail();
        $movementCountBefore = StockMovement::count();

        $this->postJson("/api/v1/inventory/receipts/{$firstId}/reverse")->assertStatus(409);

        // #579: the failed valuation reconciliation rolls back Stock, the
        // Receipt lifecycle, and movement evidence atomically — nothing is
        // partially applied.
        $stock->refresh();
        $this->assertEquals($onHandBefore, (float) $stock->on_hand);
        $this->assertEquals($wacBefore, (float) $stock->weighted_avg_cost);
        $this->assertTrue($receiptBefore->fresh()->isPosted());
        $this->assertSame($movementCountBefore, StockMovement::count());
    }

    #[Test]
    public function it_reconciles_zero_cost_free_goods_exactly_on_reversal(): void
    {
        $ctx = $this->setUpValuationVariant();

        $firstId = $this->postReceiptWithGrossAmount($ctx, packages: 10, grossAmount: 2400); // 240 @ 10
        // Free/bonus goods: gross_amount 0 => effective_unit_cost 0.
        $freeId = $this->postReceiptWithGrossAmount($ctx, packages: 10, grossAmount: 0); // 240 @ 0

        $stock = $this->stockFor($ctx['variant']);
        $this->assertEquals(480.0, (float) $stock->on_hand);
        $this->assertEquals(5.0, (float) $stock->weighted_avg_cost); // (2400+0)/480

        // Reversing the zero-cost receipt must land back on exactly the paid
        // receipt's own cost — no residual value from a unit cost of zero.
        $this->postJson("/api/v1/inventory/receipts/{$freeId}/reverse")->assertOk();

        $stock->refresh();
        $this->assertEquals(240.0, (float) $stock->on_hand);
        $this->assertEquals(10.0, (float) $stock->weighted_avg_cost);

        // The remaining paid receipt is unaffected: reversing it too fully
        // empties the row with fractional bcmath arithmetic reconciling to
        // exactly zero, never a float-drifted near-zero remainder.
        $this->postJson("/api/v1/inventory/receipts/{$firstId}/reverse")->assertOk();
        $stock->refresh();
        $this->assertEquals(0.0, (float) $stock->on_hand);
        $this->assertEquals(0.0, (float) $stock->weighted_avg_cost);
    }

    #[Test]
    public function it_reconciles_a_fractional_unit_cost_exactly_on_full_reversal(): void
    {
        $ctx = $this->setUpValuationVariant();

        // 240 base units for 1,000 gross => a repeating-decimal unit cost
        // (4.1666...), stored rounded to 4.1667 (decimal(15,4), #415).
        $id = $this->postReceiptWithGrossAmount($ctx, packages: 10, grossAmount: 1000);

        $stock = $this->stockFor($ctx['variant']);
        $this->assertEquals(4.1667, (float) $stock->weighted_avg_cost);

        // Immediate full reversal of a fractional-cost receipt reconciles
        // via exact bcmath arithmetic to precisely zero — never a
        // float-drifted near-zero remainder from the repeating decimal.
        $this->postJson("/api/v1/inventory/receipts/{$id}/reverse")->assertOk();

        $stock->refresh();
        $this->assertEquals(0.0, (float) $stock->on_hand);
        $this->assertEquals(0.0, (float) $stock->weighted_avg_cost);
    }

    #[Test]
    public function it_preserves_value_across_both_locations_when_reversing_a_receipt_after_a_transfer(): void
    {
        $ctx = $this->setUpValuationVariant();

        $destinationB = InventoryLocation::create([
            'operating_unit_id' => $this->operatingUnit->id,
            'name' => 'Transfer Destination',
            'type' => InventoryLocation::TYPE_KITCHEN,
            'priority' => 50,
            'is_active' => true,
        ]);

        VariantLocationAssignment::create([
            'inventory_location_id' => $destinationB->id,
            'item_variant_id' => $ctx['variant']->id,
        ]);

        $firstId = $this->postReceiptWithGrossAmount($ctx, packages: 10, grossAmount: 2400); // 240 @ 10
        $this->postReceiptWithGrossAmount($ctx, packages: 10, grossAmount: 4800); // 240 @ 20

        $stockA = $this->stockFor($ctx['variant']);
        $this->assertEquals(480.0, (float) $stockA->on_hand);
        $this->assertEquals(15.0, (float) $stockA->weighted_avg_cost); // value 7,200

        // Move 200 base units (kg) from A to B — homogeneous units, so A's own
        // average is left untouched; B blends the snapshot cost as inbound.
        $transferId = $this->postJson('/api/v1/inventory/transfers', [
            'source_location_id' => $this->location->public_id,
            'destination_location_id' => $destinationB->public_id,
            'reference' => 'TR-579',
            'transfer_date' => '2026-08-26',
            'lines' => [[
                'item_variant_id' => $ctx['variant']->public_id,
                'entry_uom_id' => $this->uomKg->public_id,
                'entry_quantity' => 200,
            ]],
        ])->assertCreated()->json('data.id');
        $this->postJson("/api/v1/inventory/transfers/{$transferId}/post")->assertOk();

        $stockA->refresh();
        $stockB = $this->stockFor($ctx['variant'], $destinationB);
        $this->assertEquals(280.0, (float) $stockA->on_hand);
        $this->assertEquals(15.0, (float) $stockA->weighted_avg_cost); // 4,200
        $this->assertEquals(200.0, (float) $stockB->on_hand);
        $this->assertEquals(15.0, (float) $stockB->weighted_avg_cost); // 3,000

        // Reversing the first receipt (240 @ 10 = 2,400) only ever touches A —
        // B's Stock and value are untouched by a reversal at a different
        // Location entirely.
        $this->postJson("/api/v1/inventory/receipts/{$firstId}/reverse")->assertOk();

        $stockA->refresh();
        $stockB->refresh();
        $this->assertEquals(40.0, (float) $stockA->on_hand);
        $this->assertEquals(45.0, (float) $stockA->weighted_avg_cost); // (4,200-2,400)/40
        $this->assertEquals(200.0, (float) $stockB->on_hand);
        $this->assertEquals(15.0, (float) $stockB->weighted_avg_cost); // untouched

        // Total system value now reconciles to exactly what was posted minus
        // what was reversed: 7,200 - 2,400 = 4,800, split across both ends.
        $totalValue = ((float) $stockA->on_hand * (float) $stockA->weighted_avg_cost)
            + ((float) $stockB->on_hand * (float) $stockB->weighted_avg_cost);
        $this->assertEqualsWithDelta(4800.0, $totalValue, 0.01);
    }

    #[Test]
    public function sequential_reversals_never_hit_a_spurious_residual_value_boundary(): void
    {
        // Regression for a Codex review finding on this Issue's own PR (#626):
        // reconstructing "prior value" as qty * weighted_avg_cost compounds a
        // fresh rounding error into every successive reversal. A base-unit
        // presentation (factor 1) isolates the unit costs exactly: 1 @ 0.1
        // blended with 2 @ 0.2 stores a *rounded* average of 0.1667 — but the
        // exact `Stock.total_value` accumulator never rounds until the final
        // display step, so reversing *both* receipts in sequence must still
        // succeed, landing on exactly zero rather than a spurious 409.
        $item = $this->createItem();
        $variant = $this->createItemVariant($item);
        $template = $this->createPurchasePresentationTemplate(['base_unit_quantity' => 1]);
        $presentation = $this->createVariantPurchasePresentation($variant, $template);
        $supplier = $this->createSupplier();

        $ctx = compact('variant', 'presentation', 'supplier');

        $firstId = $this->postReceiptWithGrossAmount($ctx, packages: 1, grossAmount: 0.1); // 1 @ 0.1
        $secondId = $this->postReceiptWithGrossAmount($ctx, packages: 2, grossAmount: 0.4); // 2 @ 0.2

        $stock = $this->stockFor($variant);
        $this->assertEquals(3.0, (float) $stock->on_hand);
        $this->assertEquals(0.1667, (float) $stock->weighted_avg_cost);

        $this->postJson("/api/v1/inventory/receipts/{$firstId}/reverse")->assertOk();
        $stock->refresh();
        $this->assertEquals(2.0, (float) $stock->on_hand);
        // Exactly 0.2 — not the 0.2001 a rounded-average reconstruction drifts to.
        $this->assertEquals(0.2, (float) $stock->weighted_avg_cost);

        // The bug this regression-tests: reversing the *second* receipt next
        // would previously see a spurious residual on this now-fully-emptied
        // balance and wrongly refuse with a 409.
        $this->postJson("/api/v1/inventory/receipts/{$secondId}/reverse")->assertOk();
        $stock->refresh();
        $this->assertEquals(0.0, (float) $stock->on_hand);
        $this->assertEquals(0.0, (float) $stock->weighted_avg_cost);
    }
}
