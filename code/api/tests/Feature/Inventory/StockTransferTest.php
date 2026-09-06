<?php

namespace Tests\Feature\Inventory;

use App\Models\InventoryLocation;
use App\Models\ItemVariant;
use App\Models\OperatingUnit;
use App\Models\Stock;
use App\Models\StockMovement;
use App\Models\StockTransfer;
use App\Models\UnitOfMeasure;
use App\Models\UomConversion;
use App\Models\User;
use App\Models\VariantLocationAssignment;
use Illuminate\Database\QueryException;
use Laravel\Passport\Passport;
use PHPUnit\Framework\Attributes\Test;
use Spatie\Permission\Models\Permission;

class StockTransferTest extends InventoryTestCase
{
    private InventoryLocation $destination;

    private ItemVariant $variant;

    protected function setUp(): void
    {
        parent::setUp();

        // A second stock-holding Location in the same Operating Unit as the
        // base `$this->location` (which acts as the transfer source).
        $this->destination = InventoryLocation::create([
            'operating_unit_id' => $this->operatingUnit->id,
            'name' => 'Test Kitchen',
            'type' => InventoryLocation::TYPE_KITCHEN,
            'priority' => 50,
            'is_active' => true,
        ]);

        $this->variant = $this->createItemVariant($this->createItem());

        // The destination manages the Variant (assignment contract, #569).
        VariantLocationAssignment::create([
            'inventory_location_id' => $this->destination->id,
            'item_variant_id' => $this->variant->id,
        ]);
    }

    private function seedSourceStock(float $onHand = 100, float $reserved = 0, float $cost = 10): Stock
    {
        return Stock::create([
            'inventory_location_id' => $this->location->id,
            'item_variant_id' => $this->variant->id,
            'on_hand' => $onHand,
            'reserved' => $reserved,
            'weighted_avg_cost' => $cost,
            'meta' => [],
        ]);
    }

    /**
     * @param  array<int, array<string, mixed>>|null  $lines
     * @return array<string, mixed>
     */
    private function draftPayload(?array $lines = null, array $overrides = []): array
    {
        return array_merge([
            'source_location_id' => $this->location->public_id,
            'destination_location_id' => $this->destination->public_id,
            'reference' => 'TR-1',
            'transfer_date' => '2026-09-05',
            'lines' => $lines ?? [[
                'item_variant_id' => $this->variant->public_id,
                'entry_uom_id' => $this->uomKg->public_id,
                'entry_quantity' => 12,
            ]],
        ], $overrides);
    }

    private function createDraft(?array $lines = null, array $overrides = []): string
    {
        return $this->postJson('/api/v1/inventory/transfers', $this->draftPayload($lines, $overrides))
            ->assertCreated()
            ->json('data.id');
    }

    // ---------------------------------------------------------------- CRUD ---

    #[Test]
    public function creating_a_draft_persists_lines_and_changes_no_stock(): void
    {
        $this->seedSourceStock(onHand: 100);

        $response = $this->postJson('/api/v1/inventory/transfers', $this->draftPayload())
            ->assertCreated()
            ->assertJsonPath('data.status', 'DRAFT')
            ->assertJsonPath('data.lines.0.base_quantity', 12);

        $this->assertDatabaseCount('stock_transfer_lines', 1);
        $this->assertSame(0, StockMovement::count());
        $this->assertEquals(100.0, (float) Stock::where('inventory_location_id', $this->location->id)->value('on_hand'));
        $this->assertNull($response->json('data.lines.0.source_unit_cost'));
    }

    #[Test]
    public function a_draft_cannot_have_the_same_source_and_destination(): void
    {
        $this->postJson('/api/v1/inventory/transfers', $this->draftPayload(overrides: [
            'destination_location_id' => $this->location->public_id,
        ]))->assertStatus(422)->assertJsonValidationErrors('destination_location_id');
    }

    #[Test]
    public function a_draft_cannot_list_the_same_variant_twice(): void
    {
        $this->postJson('/api/v1/inventory/transfers', $this->draftPayload([
            ['item_variant_id' => $this->variant->public_id, 'entry_uom_id' => $this->uomKg->public_id, 'entry_quantity' => 3],
            ['item_variant_id' => $this->variant->public_id, 'entry_uom_id' => $this->uomKg->public_id, 'entry_quantity' => 4],
        ]))->assertStatus(422)->assertJsonValidationErrors('lines.1.item_variant_id');
    }

    #[Test]
    public function a_draft_line_rejects_a_uom_with_no_conversion_to_the_variant_base(): void
    {
        // uomGr converts to uomKg, but create a brand-new orphan UOM instead.
        $orphan = \App\Models\UnitOfMeasure::create([
            'code' => 'BOX', 'name' => 'Box', 'symbol' => 'box', 'type' => 'COUNT',
            'precision' => 0, 'is_base' => false, 'is_active' => true,
        ]);

        $this->postJson('/api/v1/inventory/transfers', $this->draftPayload([
            ['item_variant_id' => $this->variant->public_id, 'entry_uom_id' => $orphan->public_id, 'entry_quantity' => 1],
        ]))->assertStatus(422)->assertJsonValidationErrors('lines.0.entry_uom_id');
    }

    #[Test]
    public function a_draft_line_rejects_a_quantity_below_the_smallest_storable_step(): void
    {
        $this->postJson('/api/v1/inventory/transfers', $this->draftPayload([
            ['item_variant_id' => $this->variant->public_id, 'entry_uom_id' => $this->uomKg->public_id, 'entry_quantity' => 0.00001],
        ]))->assertStatus(422)->assertJsonValidationErrors('lines.0.entry_quantity');
    }

    #[Test]
    public function a_draft_line_rejects_a_quantity_that_rounds_to_zero_in_the_base_uom(): void
    {
        // Base UOM is KG; 0.04 GR converts to 0.00004 KG, which rounds to 0.0000
        // at decimal(15,4) and would trip the DB `> 0` CHECK as a 500.
        $this->postJson('/api/v1/inventory/transfers', $this->draftPayload([
            ['item_variant_id' => $this->variant->public_id, 'entry_uom_id' => $this->uomGr->public_id, 'entry_quantity' => 0.04],
        ]))->assertStatus(422)->assertJsonValidationErrors('lines.0.entry_quantity');
    }

    #[Test]
    public function updating_a_draft_replaces_its_lines(): void
    {
        $secondVariant = $this->createItemVariant($this->createItem());
        VariantLocationAssignment::create([
            'inventory_location_id' => $this->destination->id,
            'item_variant_id' => $secondVariant->id,
        ]);

        $id = $this->createDraft();

        $this->putJson("/api/v1/inventory/transfers/{$id}", $this->draftPayload([
            ['item_variant_id' => $secondVariant->public_id, 'entry_uom_id' => $this->uomKg->public_id, 'entry_quantity' => 5],
        ]))->assertOk()->assertJsonPath('data.lines.0.entry_quantity', 5);

        $this->assertDatabaseCount('stock_transfer_lines', 1);
    }

    #[Test]
    public function a_posted_transfer_cannot_be_edited_or_deleted(): void
    {
        $this->seedSourceStock();
        $id = $this->createDraft();
        $this->postJson("/api/v1/inventory/transfers/{$id}/post")->assertOk();

        $this->putJson("/api/v1/inventory/transfers/{$id}", $this->draftPayload())->assertStatus(409);
        $this->deleteJson("/api/v1/inventory/transfers/{$id}")->assertStatus(409);
    }

    #[Test]
    public function a_draft_can_be_deleted(): void
    {
        $id = $this->createDraft();

        $this->deleteJson("/api/v1/inventory/transfers/{$id}")->assertNoContent();
        $this->assertSoftDeleted('stock_transfers', ['public_id' => $id]);
    }

    // ------------------------------------------------------------- POSTING ---

    #[Test]
    public function posting_moves_exactly_the_base_quantity_from_source_to_destination(): void
    {
        $this->seedSourceStock(onHand: 100, cost: 10);
        $id = $this->createDraft();

        $this->postJson("/api/v1/inventory/transfers/{$id}/post")
            ->assertOk()
            ->assertJsonPath('data.status', 'POSTED');

        $source = Stock::where('inventory_location_id', $this->location->id)->where('item_variant_id', $this->variant->id)->first();
        $destination = Stock::where('inventory_location_id', $this->destination->id)->where('item_variant_id', $this->variant->id)->first();

        $this->assertEquals(88.0, (float) $source->on_hand);
        $this->assertNotNull($destination);
        $this->assertEquals(12.0, (float) $destination->on_hand);

        $movement = StockMovement::where('related_type', StockTransfer::class)
            ->where('reason', StockMovement::REASON_TRANSFER)
            ->first();

        $this->assertNotNull($movement);
        $this->assertEquals(12.0, (float) $movement->qty);
        $this->assertSame($this->location->id, (int) $movement->from_location_id);
        $this->assertSame($this->destination->id, (int) $movement->to_location_id);
        $this->assertTrue($movement->isPosted());
        $this->assertNotNull($movement->lines()->first());
    }

    #[Test]
    public function stock_and_movement_history_identify_the_transfer_and_line_that_caused_the_change(): void
    {
        $this->seedSourceStock();
        $id = $this->createDraft();
        $this->postJson("/api/v1/inventory/transfers/{$id}/post")->assertOk();

        $transfer = StockTransfer::where('public_id', $id)->firstOrFail();
        $line = $transfer->lines()->firstOrFail();

        $movement = StockMovement::where('related_type', StockTransfer::class)
            ->where('related_id', $transfer->id)
            ->where('reason', StockMovement::REASON_TRANSFER)
            ->firstOrFail();

        $this->assertSame($line->id, (int) $movement->related_line_id);
    }

    #[Test]
    public function posting_converts_the_entry_uom_to_the_variant_base_uom(): void
    {
        // Base UOM is KG; capture the line in GR (1 KG = 1000 GR).
        $this->seedSourceStock(onHand: 5); // 5 kg on hand
        $id = $this->createDraft([
            ['item_variant_id' => $this->variant->public_id, 'entry_uom_id' => $this->uomGr->public_id, 'entry_quantity' => 2000],
        ]);

        // Base UOM is KG; the GR -> KG conversion factor is 0.001.
        $this->postJson("/api/v1/inventory/transfers/{$id}/post")
            ->assertOk()
            ->assertJsonPath('data.lines.0.base_quantity', 2)
            ->assertJsonPath('data.lines.0.conversion_factor', 0.001);

        $this->assertEquals(3.0, (float) Stock::where('inventory_location_id', $this->location->id)->value('on_hand'));
        $this->assertEquals(2.0, (float) Stock::where('inventory_location_id', $this->destination->id)->value('on_hand'));
    }

    #[Test]
    public function posting_is_rejected_when_the_variant_is_not_assigned_to_the_destination(): void
    {
        VariantLocationAssignment::where('inventory_location_id', $this->destination->id)->delete();
        $this->seedSourceStock();
        $id = $this->createDraft();

        $this->postJson("/api/v1/inventory/transfers/{$id}/post")
            ->assertStatus(409)
            ->assertJsonFragment(['status' => 409]);

        $this->assertSame('DRAFT', StockTransfer::where('public_id', $id)->value('status'));
        $this->assertEquals(100.0, (float) Stock::where('inventory_location_id', $this->location->id)->value('on_hand'));
    }

    #[Test]
    public function posting_is_rejected_when_the_source_has_insufficient_stock(): void
    {
        $this->seedSourceStock(onHand: 5);
        $id = $this->createDraft(); // wants 12

        $this->postJson("/api/v1/inventory/transfers/{$id}/post")->assertStatus(409);
        $this->assertEquals(5.0, (float) Stock::where('inventory_location_id', $this->location->id)->value('on_hand'));
    }

    #[Test]
    public function posting_is_rejected_when_reserved_stock_leaves_too_little_unreserved(): void
    {
        $this->seedSourceStock(onHand: 15, reserved: 10); // only 5 unreserved
        $id = $this->createDraft(); // wants 12

        $this->postJson("/api/v1/inventory/transfers/{$id}/post")->assertStatus(409);
        $this->assertEquals(15.0, (float) Stock::where('inventory_location_id', $this->location->id)->value('on_hand'));
    }

    #[Test]
    public function a_retried_or_duplicate_post_never_moves_the_same_line_twice(): void
    {
        $this->seedSourceStock(onHand: 100);
        $id = $this->createDraft();

        $this->postJson("/api/v1/inventory/transfers/{$id}/post")->assertOk();
        $this->postJson("/api/v1/inventory/transfers/{$id}/post")->assertStatus(409);

        $this->assertEquals(88.0, (float) Stock::where('inventory_location_id', $this->location->id)->value('on_hand'));
        $this->assertEquals(12.0, (float) Stock::where('inventory_location_id', $this->destination->id)->value('on_hand'));
        $this->assertSame(1, StockMovement::where('related_type', StockTransfer::class)->where('reason', StockMovement::REASON_TRANSFER)->count());
    }

    #[Test]
    public function posting_a_multi_line_transfer_rolls_back_entirely_when_one_line_fails(): void
    {
        $goodVariant = $this->variant;
        $badVariant = $this->createItemVariant($this->createItem()); // not assigned to destination

        $this->seedSourceStock(onHand: 100); // for goodVariant
        Stock::create([
            'inventory_location_id' => $this->location->id,
            'item_variant_id' => $badVariant->id,
            'on_hand' => 50, 'reserved' => 0, 'weighted_avg_cost' => 4, 'meta' => [],
        ]);

        $id = $this->createDraft([
            ['item_variant_id' => $goodVariant->public_id, 'entry_uom_id' => $this->uomKg->public_id, 'entry_quantity' => 10],
            ['item_variant_id' => $badVariant->public_id, 'entry_uom_id' => $this->uomKg->public_id, 'entry_quantity' => 5],
        ]);

        $this->postJson("/api/v1/inventory/transfers/{$id}/post")->assertStatus(409);

        // Nothing moved — the good line was rolled back with the failing one.
        $this->assertEquals(100.0, (float) Stock::where('inventory_location_id', $this->location->id)->where('item_variant_id', $goodVariant->id)->value('on_hand'));
        $this->assertSame(0, StockMovement::count());
        $this->assertSame('DRAFT', StockTransfer::where('public_id', $id)->value('status'));
    }

    #[Test]
    public function posting_is_rejected_when_a_line_value_exceeds_the_recordable_range(): void
    {
        // 6e10 units at cost 2 = 1.2e11 — each input fits decimal(15,4), the
        // product does not. Expect a controlled 409, not a PostgreSQL 500.
        $this->seedSourceStock(onHand: 60000000000, cost: 2);
        $id = $this->createDraft([
            ['item_variant_id' => $this->variant->public_id, 'entry_uom_id' => $this->uomKg->public_id, 'entry_quantity' => 60000000000],
        ]);

        $this->postJson("/api/v1/inventory/transfers/{$id}/post")->assertStatus(409);

        $this->assertEquals(60000000000.0, (float) Stock::where('inventory_location_id', $this->location->id)->value('on_hand'));
        $this->assertSame(0, StockMovement::count());
        $this->assertSame('DRAFT', StockTransfer::where('public_id', $id)->value('status'));
    }

    #[Test]
    public function posting_is_rejected_when_the_resulting_destination_balance_exceeds_the_range(): void
    {
        // line_total stays 0 (cost 0), but 6e10 already at the destination plus a
        // 6e10 transfer would push stock.on_hand past decimal(15,4).
        $this->seedSourceStock(onHand: 60000000000, cost: 0);
        Stock::create([
            'inventory_location_id' => $this->destination->id,
            'item_variant_id' => $this->variant->id,
            'on_hand' => 60000000000, 'reserved' => 0, 'weighted_avg_cost' => 0, 'meta' => [],
        ]);

        $id = $this->createDraft([
            ['item_variant_id' => $this->variant->public_id, 'entry_uom_id' => $this->uomKg->public_id, 'entry_quantity' => 60000000000],
        ]);

        $this->postJson("/api/v1/inventory/transfers/{$id}/post")->assertStatus(409);

        $this->assertEquals(60000000000.0, (float) Stock::where('inventory_location_id', $this->location->id)->value('on_hand'));
        $this->assertSame(0, StockMovement::count());
    }

    #[Test]
    public function a_two_line_transfer_posts_each_line_as_its_own_transfer_movement(): void
    {
        $variantB = $this->createItemVariant($this->createItem(), ['name' => 'Variant B']);
        VariantLocationAssignment::create([
            'inventory_location_id' => $this->destination->id,
            'item_variant_id' => $variantB->id,
        ]);

        $this->seedSourceStock(onHand: 100); // variant A
        Stock::create([
            'inventory_location_id' => $this->location->id,
            'item_variant_id' => $variantB->id,
            'on_hand' => 40, 'reserved' => 0, 'weighted_avg_cost' => 7, 'meta' => [],
        ]);

        $id = $this->createDraft([
            ['item_variant_id' => $variantB->public_id, 'entry_uom_id' => $this->uomKg->public_id, 'entry_quantity' => 4],
            ['item_variant_id' => $this->variant->public_id, 'entry_uom_id' => $this->uomKg->public_id, 'entry_quantity' => 10],
        ]);

        $this->postJson("/api/v1/inventory/transfers/{$id}/post")->assertOk();

        $transfer = StockTransfer::where('public_id', $id)->firstOrFail();
        $movements = StockMovement::where('related_type', StockTransfer::class)
            ->where('related_id', $transfer->id)
            ->where('reason', StockMovement::REASON_TRANSFER)
            ->get();

        $this->assertCount(2, $movements);
        $this->assertEqualsCanonicalizing(
            [4.0, 10.0],
            $movements->pluck('qty')->map(fn ($q) => (float) $q)->all()
        );
        $this->assertEquals(90.0, (float) Stock::where('inventory_location_id', $this->location->id)->where('item_variant_id', $this->variant->id)->value('on_hand'));
        $this->assertEquals(36.0, (float) Stock::where('inventory_location_id', $this->location->id)->where('item_variant_id', $variantB->id)->value('on_hand'));
    }

    #[Test]
    public function posting_is_rejected_when_an_endpoint_location_is_deactivated_after_the_draft(): void
    {
        $this->seedSourceStock();
        $id = $this->createDraft();

        $this->destination->update(['is_active' => false]);

        $this->postJson("/api/v1/inventory/transfers/{$id}/post")
            ->assertStatus(409)
            ->assertJsonFragment(['status' => 409]);

        $this->assertSame('DRAFT', StockTransfer::where('public_id', $id)->value('status'));
    }

    #[Test]
    public function the_summary_list_row_reports_the_line_count(): void
    {
        $this->createDraft();

        $this->getJson('/api/v1/inventory/transfers')
            ->assertOk()
            ->assertJsonPath('data.0.line_count', 1)
            ->assertJsonPath('data.0.source_location.name', 'Test Warehouse')
            ->assertJsonPath('data.0.destination_location.name', 'Test Kitchen');
    }

    // ------------------------------------------------------- COST POLICY ---

    #[Test]
    public function posting_blends_the_destination_wac_and_leaves_the_source_wac_unchanged(): void
    {
        // Source holds 100 @ 10. Destination already holds 100 @ 20.
        $this->seedSourceStock(onHand: 100, cost: 10);
        Stock::create([
            'inventory_location_id' => $this->destination->id,
            'item_variant_id' => $this->variant->id,
            'on_hand' => 100, 'reserved' => 0, 'weighted_avg_cost' => 20, 'meta' => [],
        ]);

        $id = $this->createDraft([
            ['item_variant_id' => $this->variant->public_id, 'entry_uom_id' => $this->uomKg->public_id, 'entry_quantity' => 100],
        ]);

        $this->postJson("/api/v1/inventory/transfers/{$id}/post")
            ->assertOk()
            ->assertJsonPath('data.lines.0.source_unit_cost', 10);

        $source = Stock::where('inventory_location_id', $this->location->id)->where('item_variant_id', $this->variant->id)->first();
        $destination = Stock::where('inventory_location_id', $this->destination->id)->where('item_variant_id', $this->variant->id)->first();

        $this->assertEquals(10.0, (float) $source->weighted_avg_cost, 'source WAC is untouched');
        // (100 @ 20 + 100 @ 10) / 200 = 15
        $this->assertEqualsWithDelta(15.0, (float) $destination->weighted_avg_cost, 0.001);
    }

    // ------------------------------------------------------------ REVERSAL ---

    #[Test]
    public function reversing_a_posted_transfer_restores_both_balances(): void
    {
        $this->seedSourceStock(onHand: 100);
        $id = $this->createDraft();
        $this->postJson("/api/v1/inventory/transfers/{$id}/post")->assertOk();

        $this->postJson("/api/v1/inventory/transfers/{$id}/reverse", ['reason' => 'Registrado por error'])
            ->assertOk()
            ->assertJsonPath('data.status', 'REVERSED');

        $this->assertEquals(100.0, (float) Stock::where('inventory_location_id', $this->location->id)->value('on_hand'));
        $this->assertEquals(0.0, (float) Stock::where('inventory_location_id', $this->destination->id)->value('on_hand'));

        $original = StockMovement::where('related_type', StockTransfer::class)
            ->where('reason', StockMovement::REASON_TRANSFER)
            ->where('reverses_stock_movement_id', null)
            ->firstOrFail();
        $this->assertTrue($original->isReversed());

        $this->assertSame(1, StockMovement::whereNotNull('reverses_stock_movement_id')->count());
    }

    #[Test]
    public function reversing_a_draft_or_an_already_reversed_transfer_is_a_conflict(): void
    {
        $this->seedSourceStock();
        $id = $this->createDraft();

        $this->postJson("/api/v1/inventory/transfers/{$id}/reverse")->assertStatus(409);

        $this->postJson("/api/v1/inventory/transfers/{$id}/post")->assertOk();
        $this->postJson("/api/v1/inventory/transfers/{$id}/reverse")->assertOk();
        $this->postJson("/api/v1/inventory/transfers/{$id}/reverse")->assertStatus(409);
    }

    #[Test]
    public function reversal_is_blocked_when_the_destination_stock_fell_below_the_transferred_quantity(): void
    {
        $this->seedSourceStock(onHand: 100);
        $id = $this->createDraft();
        $this->postJson("/api/v1/inventory/transfers/{$id}/post")->assertOk();

        // Consume the destination stock the transfer added.
        $destination = Stock::where('inventory_location_id', $this->destination->id)->where('item_variant_id', $this->variant->id)->firstOrFail();
        $destination->update(['on_hand' => 0]);

        $this->postJson("/api/v1/inventory/transfers/{$id}/reverse")->assertStatus(409);
        $this->assertSame('POSTED', StockTransfer::where('public_id', $id)->value('status'));
    }

    // -------------------------------------------------------- AUTHORIZATION ---

    #[Test]
    public function reads_require_stock_view_and_writes_require_stock_manage(): void
    {
        $viewer = User::factory()->create();
        $viewer->assignRole($this->roleWithPermissions('viewer-only', ['stock.view']));
        $viewer->operatingUnits()->attach($this->operatingUnit->id, ['assignment_role' => 'INVENTORY', 'is_active' => true]);

        Passport::actingAs($viewer);
        $this->getJson('/api/v1/inventory/transfers')->assertOk();
        $this->postJson('/api/v1/inventory/transfers', $this->draftPayload())->assertStatus(403);
    }

    #[Test]
    public function mutating_a_transfer_requires_access_to_both_endpoint_operating_units(): void
    {
        // A second Operating Unit + Location the base user has no membership in.
        $otherUnit = OperatingUnit::create([
            'branch_id' => $this->branch->id,
            'type' => 'BRANCH_MAIN',
            'name' => 'Other Unit',
            'is_active' => true,
        ]);
        $foreignDestination = InventoryLocation::create([
            'operating_unit_id' => $otherUnit->id,
            'name' => 'Foreign Kitchen',
            'type' => InventoryLocation::TYPE_KITCHEN,
            'priority' => 10,
            'is_active' => true,
        ]);

        // Build the transfer as an admin (bypass) so it exists cross-unit.
        $admin = User::factory()->create();
        $admin->assignRole($this->roleWithPermissions('admin', ['stock.view', 'stock.manage']));
        Passport::actingAs($admin);
        VariantLocationAssignment::create([
            'inventory_location_id' => $foreignDestination->id,
            'item_variant_id' => $this->variant->id,
        ]);
        $id = $this->postJson('/api/v1/inventory/transfers', $this->draftPayload(overrides: [
            'destination_location_id' => $foreignDestination->public_id,
        ]))->assertCreated()->json('data.id');

        // The scoped base user can only reach the source unit → 403 on mutate,
        // and the detail resource tells the UI so via can_mutate=false (it can
        // still read the cross-unit transfer via the source endpoint).
        Passport::actingAs($this->user);
        $this->getJson("/api/v1/inventory/transfers/{$id}")
            ->assertOk()
            ->assertJsonPath('data.can_mutate', false);
        $this->postJson("/api/v1/inventory/transfers/{$id}/post")->assertStatus(403);

        Passport::actingAs($admin);
        $this->getJson("/api/v1/inventory/transfers/{$id}")
            ->assertOk()
            ->assertJsonPath('data.can_mutate', true);
    }

    #[Test]
    public function a_location_with_transfer_history_cannot_be_permanently_deleted(): void
    {
        $this->createDraft();

        $this->expectException(QueryException::class);
        $this->location->forceDelete();
    }

    #[Test]
    public function deleting_a_uom_referenced_only_by_a_transfer_line_is_a_conflict_and_leaves_it_intact(): void
    {
        $txUom = UnitOfMeasure::create([
            'code' => 'TXBOX', 'name' => 'Transfer Box', 'symbol' => 'box',
            'type' => 'COUNT', 'precision' => 0, 'is_base' => false, 'is_active' => true,
        ]);
        $conversion = UomConversion::create([
            'from_uom_id' => $txUom->id, 'to_uom_id' => $this->uomKg->id,
            'factor' => 5, 'tolerance_percent' => 0.5, 'is_active' => true,
        ]);

        // A draft line captured in the new UOM — its only reference.
        $this->createDraft([
            ['item_variant_id' => $this->variant->public_id, 'entry_uom_id' => $txUom->public_id, 'entry_quantity' => 2],
        ]);

        Permission::firstOrCreate(['name' => 'units_of_measure.manage', 'guard_name' => 'api']);
        $this->user->givePermissionTo('units_of_measure.manage');

        $this->deleteJson("/api/v1/units-of-measure/{$txUom->public_id}")->assertStatus(409);

        $this->assertNotNull(UnitOfMeasure::find($txUom->id));
        $this->assertDatabaseHas('uom_conversions', ['id' => $conversion->id]);
    }

    #[Test]
    public function a_draft_line_rejects_a_quantity_above_the_storable_range(): void
    {
        $this->postJson('/api/v1/inventory/transfers', $this->draftPayload([
            ['item_variant_id' => $this->variant->public_id, 'entry_uom_id' => $this->uomKg->public_id, 'entry_quantity' => 100000000000],
        ]))->assertStatus(422)->assertJsonValidationErrors('lines.0.entry_quantity');
    }

    #[Test]
    public function a_draft_line_rejects_a_converted_base_quantity_above_the_storable_range(): void
    {
        // A GR-based Variant: 1e9 KG entered converts to 1e12 GR — inside the
        // entry-quantity band but far outside decimal(15,4) in the base UOM.
        $grVariant = $this->createItemVariant($this->createItem(), ['uom_id' => $this->uomGr->id]);
        VariantLocationAssignment::create([
            'inventory_location_id' => $this->destination->id,
            'item_variant_id' => $grVariant->id,
        ]);

        $this->postJson('/api/v1/inventory/transfers', $this->draftPayload([
            ['item_variant_id' => $grVariant->public_id, 'entry_uom_id' => $this->uomKg->public_id, 'entry_quantity' => 1000000000],
        ]))->assertStatus(422)->assertJsonValidationErrors('lines.0.entry_quantity');
    }

    #[Test]
    public function the_list_is_operating_unit_scoped_and_filterable(): void
    {
        $this->seedSourceStock();
        $draftId = $this->createDraft();
        $this->createDraft(overrides: ['reference' => 'TR-OTHER']);

        $this->getJson('/api/v1/inventory/transfers?status=DRAFT')
            ->assertOk()
            ->assertJsonPath('meta.total', 2);

        $this->getJson('/api/v1/inventory/transfers?search=TR-OTHER')
            ->assertOk()
            ->assertJsonPath('meta.total', 1)
            ->assertJsonPath('data.0.reference', 'TR-OTHER');

        $this->getJson("/api/v1/inventory/transfers/{$draftId}")
            ->assertOk()
            ->assertJsonPath('data.id', $draftId);
    }

    /**
     * @param  array<int, string>  $permissions
     */
    private function roleWithPermissions(string $name, array $permissions): string
    {
        $role = \Spatie\Permission\Models\Role::firstOrCreate(['name' => $name, 'guard_name' => 'api']);

        foreach ($permissions as $permission) {
            \Spatie\Permission\Models\Permission::firstOrCreate(['name' => $permission, 'guard_name' => 'api']);
        }

        $role->syncPermissions($permissions);

        return $name;
    }
}
