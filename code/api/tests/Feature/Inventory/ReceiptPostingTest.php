<?php

namespace Tests\Feature\Inventory;

use App\Models\InventoryLocation;
use App\Models\Receipt;
use App\Models\Stock;
use App\Models\StockMovement;
use App\Services\Inventory\ReceiptService;
use Illuminate\Support\Facades\DB;
use PHPUnit\Framework\Attributes\Test;

class ReceiptPostingTest extends InventoryTestCase
{
    private function createDraft(array $lineOverrides = [], array $headerOverrides = []): array
    {
        $item = $this->createItem();
        $variant = $this->createItemVariant($item);
        $template = $this->createPurchasePresentationTemplate(); // BOX x24
        $presentation = $this->createVariantPurchasePresentation($variant, $template);
        $supplier = $this->createSupplier();

        $payload = array_merge([
            'supplier_id' => $supplier->public_id,
            'destination_location_id' => $this->location->public_id,
            'reference' => 'FAC-POST-1',
            'receipt_date' => '2026-08-25',
            'lines' => [array_merge([
                'variant_purchase_presentation_id' => $presentation->public_id,
                'ordered_packages' => 1,
                'received_packages' => 1,
                'bonus_packages' => 0,
                'gross_amount' => 480,
                'discounts' => 0,
                'allocated_expenses' => 0,
                'non_recoverable_taxes' => 0,
            ], $lineOverrides)],
        ], $headerOverrides);

        $response = $this->postJson('/api/v1/inventory/receipts', $payload)->assertCreated();

        return [
            'id' => $response->json('data.id'),
            'variant' => $variant,
        ];
    }

    #[Test]
    public function a_box_x24_receipt_posts_exactly_24_base_pieces(): void
    {
        ['id' => $id, 'variant' => $variant] = $this->createDraft();

        $this->postJson("/api/v1/inventory/receipts/{$id}/post")
            ->assertOk()
            ->assertJsonPath('data.status', 'POSTED')
            ->assertJsonPath('data.lines.0.base_units_received', 24);

        $stock = Stock::where('inventory_location_id', $this->location->id)
            ->where('item_variant_id', $variant->id)
            ->first();

        $this->assertNotNull($stock);
        $this->assertEquals(24.0, (float) $stock->on_hand);
    }

    #[Test]
    public function bonus_packages_reduce_effective_unit_cost_without_changing_the_presentation_factor(): void
    {
        // Baseline: 10 boxes received, all paid — 4800 for 240 base pieces => cost 20/unit.
        ['id' => $baselineId] = $this->createDraft([
            'ordered_packages' => 10,
            'received_packages' => 10,
            'bonus_packages' => 0,
            'gross_amount' => 4800,
        ]);

        // Same physical receipt (10 boxes = 240 base pieces), but only 8 were paid for —
        // the other 2 are bonus, so gross_amount only covers 8 boxes at the same 480/box rate.
        ['id' => $bonusId] = $this->createDraft([
            'ordered_packages' => 8,
            'received_packages' => 10,
            'bonus_packages' => 2,
            'gross_amount' => 3840,
        ]);

        $baseline = $this->postJson("/api/v1/inventory/receipts/{$baselineId}/post")->assertOk();
        $bonus = $this->postJson("/api/v1/inventory/receipts/{$bonusId}/post")->assertOk();

        $baseline->assertJsonPath('data.lines.0.presentation_factor', 24);
        $bonus->assertJsonPath('data.lines.0.presentation_factor', 24);

        $baselineCost = $baseline->json('data.lines.0.effective_unit_cost');
        $bonusCost = $bonus->json('data.lines.0.effective_unit_cost');

        $this->assertEquals(20.0, $baselineCost);
        $this->assertEquals(16.0, $bonusCost);
        $this->assertLessThan($baselineCost, $bonusCost);
    }

    #[Test]
    public function posted_evidence_reproduces_net_amount_base_units_and_unit_cost(): void
    {
        ['id' => $id, 'variant' => $variant] = $this->createDraft([
            'received_packages' => 10,
            'gross_amount' => 4800,
            'allocated_expenses' => 150,
        ]);

        $this->postJson("/api/v1/inventory/receipts/{$id}/post")->assertOk();

        $show = $this->getJson("/api/v1/inventory/receipts/{$id}")->assertOk();
        $show->assertJsonPath('data.lines.0.net_acquisition_amount', 4950)
            ->assertJsonPath('data.lines.0.base_units_received', 240)
            ->assertJsonPath('data.lines.0.effective_unit_cost', 20.625);

        $movement = StockMovement::where('related_type', Receipt::class)
            ->where('reason', StockMovement::REASON_PURCHASE_RECEIPT)
            ->where('item_variant_id', $variant->id)
            ->first();

        $this->assertNotNull($movement);
        $this->assertEquals(240.0, (float) $movement->qty);
        $this->assertTrue($movement->isPosted());

        $line = $movement->lines()->first();
        $this->assertNotNull($line);
        $this->assertEquals(20.625, (float) $line->unit_cost);
        $this->assertEquals(4950.0, (float) $line->line_total);
    }

    #[Test]
    public function posting_stamps_explicit_source_line_identity_on_each_movement(): void
    {
        ['id' => $id, 'variant' => $variant] = $this->createDraft();
        $receipt = Receipt::where('public_id', $id)->firstOrFail();

        $this->postJson("/api/v1/inventory/receipts/{$id}/post")->assertOk();

        $line = $receipt->lines()->firstOrFail();
        $movement = StockMovement::where('related_type', Receipt::class)
            ->where('related_id', $receipt->id)
            ->where('reason', StockMovement::REASON_PURCHASE_RECEIPT)
            ->firstOrFail();

        $this->assertSame($line->id, (int) $movement->related_line_id);
        // Identity is a first-class column now, not hidden in meta.
        $this->assertArrayNotHasKey('receipt_line_id', $movement->meta ?? []);
    }

    #[Test]
    public function two_lines_of_one_receipt_post_as_independent_movements(): void
    {
        $item = $this->createItem();
        $variantA = $this->createItemVariant($item, ['name' => 'Variant A']);
        $variantB = $this->createItemVariant($item, ['name' => 'Variant B']);
        $template = $this->createPurchasePresentationTemplate(); // BOX x24
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
        ])->json('data.id');

        $this->postJson("/api/v1/inventory/receipts/{$id}/post")->assertOk();

        $receipt = Receipt::where('public_id', $id)->firstOrFail();
        $movements = StockMovement::where('related_type', Receipt::class)
            ->where('related_id', $receipt->id)
            ->where('reason', StockMovement::REASON_PURCHASE_RECEIPT)
            ->get();

        $this->assertCount(2, $movements);
        $this->assertEqualsCanonicalizing(
            $receipt->lines()->pluck('id')->all(),
            $movements->pluck('related_line_id')->map(fn ($v) => (int) $v)->all()
        );
        $this->assertEquals(24.0, (float) Stock::where('item_variant_id', $variantA->id)->value('on_hand'));
        $this->assertEquals(48.0, (float) Stock::where('item_variant_id', $variantB->id)->value('on_hand'));
    }

    #[Test]
    public function it_locks_the_receipt_row_for_update_when_posting(): void
    {
        ['id' => $id] = $this->createDraft();
        $receipt = Receipt::where('public_id', $id)->first();

        $queries = [];
        DB::listen(function ($query) use (&$queries) {
            $queries[] = $query->sql;
        });

        app(ReceiptService::class)->postReceipt($receipt->id, $this->user->id);

        $lockedQueries = array_filter($queries, fn ($sql) => str_contains(strtolower($sql), 'for update'));
        $this->assertNotEmpty($lockedQueries);
    }

    #[Test]
    public function it_locks_the_referenced_variant_rows_for_update_when_posting(): void
    {
        ['id' => $id, 'variant' => $variant] = $this->createDraft();
        $receipt = Receipt::where('public_id', $id)->first();

        $queries = [];
        DB::listen(function ($query) use (&$queries) {
            $queries[] = strtolower($query->sql);
        });

        app(ReceiptService::class)->postReceipt($receipt->id, $this->user->id);

        $variantLock = array_filter(
            $queries,
            fn ($sql) => str_contains($sql, 'from "item_variants"') && str_contains($sql, 'for update')
        );

        $this->assertNotEmpty($variantLock, 'posting must lock the referenced item_variants rows');
    }

    #[Test]
    public function posting_an_already_posted_receipt_is_rejected(): void
    {
        ['id' => $id] = $this->createDraft();

        $this->postJson("/api/v1/inventory/receipts/{$id}/post")->assertOk();
        $this->postJson("/api/v1/inventory/receipts/{$id}/post")->assertStatus(409);
    }

    #[Test]
    public function posting_a_reversed_receipt_is_rejected(): void
    {
        ['id' => $id] = $this->createDraft();

        $this->postJson("/api/v1/inventory/receipts/{$id}/post")->assertOk();
        $this->postJson("/api/v1/inventory/receipts/{$id}/reverse")->assertOk();
        $this->postJson("/api/v1/inventory/receipts/{$id}/post")->assertStatus(409);
    }

    #[Test]
    public function posting_requires_receipts_manage_permission(): void
    {
        ['id' => $id] = $this->createDraft();
        $this->user->removeRole('inventory-manager');

        $this->postJson("/api/v1/inventory/receipts/{$id}/post")->assertForbidden();
    }

    #[Test]
    public function posting_is_rejected_when_the_destination_location_was_soft_deleted_after_the_draft_was_created(): void
    {
        $destination = InventoryLocation::create([
            'operating_unit_id' => $this->operatingUnit->id,
            'name' => 'Temp Warehouse',
            'type' => 'MAIN',
            'priority' => 50,
            'is_active' => true,
            'can_receive_purchases' => true,
        ]);

        ['id' => $id] = $this->createDraft([], ['destination_location_id' => $destination->public_id]);

        $destination->delete();

        $this->postJson("/api/v1/inventory/receipts/{$id}/post")->assertStatus(409);
    }

    #[Test]
    public function posting_is_rejected_when_the_variant_was_soft_deleted_after_the_draft_was_created(): void
    {
        ['id' => $id, 'variant' => $variant] = $this->createDraft();

        $variant->delete();

        $this->postJson("/api/v1/inventory/receipts/{$id}/post")->assertStatus(409);
    }

    #[Test]
    public function posting_is_rejected_when_the_variant_was_deactivated_after_the_draft_was_created(): void
    {
        // A deactivated (not soft-deleted) variant still resolves through the
        // presentation relation, but AssignVariantToLocationController refuses to
        // assign it — receipt posting must not create that assignment through the
        // back door, so the whole post is a 409 and rolls back (#572).
        ['id' => $id, 'variant' => $variant] = $this->createDraft();

        $variant->update(['is_active' => false]);

        $this->postJson("/api/v1/inventory/receipts/{$id}/post")->assertStatus(409);

        $this->assertSame(Receipt::STATUS_DRAFT, Receipt::where('public_id', $id)->value('status'));
        $this->assertDatabaseMissing('variant_location_assignments', [
            'inventory_location_id' => $this->location->id,
            'item_variant_id' => $variant->id,
        ]);
        $this->assertSame(0, Stock::where('item_variant_id', $variant->id)->count());
    }
}
