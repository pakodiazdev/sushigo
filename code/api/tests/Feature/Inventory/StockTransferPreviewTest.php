<?php

namespace Tests\Feature\Inventory;

use App\Models\InventoryLocation;
use App\Models\ItemVariant;
use App\Models\OperatingUnit;
use App\Models\Stock;
use App\Models\UnitOfMeasure;
use App\Models\VariantLocationAssignment;
use PHPUnit\Framework\Attributes\Test;

/**
 * The non-mutating source-availability preview endpoint (#613), the one
 * Technical Task carried over from #573: shows the operator the source
 * Location's current on-hand/available for a Variant and the normalized
 * base-UOM quantity a Stock Transfer line would move, without posting
 * anything.
 */
class StockTransferPreviewTest extends InventoryTestCase
{
    private InventoryLocation $destination;

    private ItemVariant $variant;

    protected function setUp(): void
    {
        parent::setUp();

        $this->destination = InventoryLocation::create([
            'operating_unit_id' => $this->operatingUnit->id,
            'name' => 'Test Kitchen',
            'type' => InventoryLocation::TYPE_KITCHEN,
            'priority' => 50,
            'is_active' => true,
        ]);

        $this->variant = $this->createItemVariant($this->createItem(), ['uom_id' => $this->uomKg->id]);

        VariantLocationAssignment::create([
            'inventory_location_id' => $this->destination->id,
            'item_variant_id' => $this->variant->id,
        ]);
    }

    private function seedSourceStock(float $onHand = 100, float $reserved = 0): Stock
    {
        return Stock::create([
            'inventory_location_id' => $this->location->id,
            'item_variant_id' => $this->variant->id,
            'on_hand' => $onHand,
            'reserved' => $reserved,
            'weighted_avg_cost' => 10,
            'meta' => [],
        ]);
    }

    #[Test]
    public function it_previews_a_same_uom_line_without_writing_anything(): void
    {
        $this->seedSourceStock(onHand: 100, reserved: 15);

        $data = $this->postJson('/api/v1/inventory/transfers/preview', [
            'source_location_id' => $this->location->public_id,
            'item_variant_id' => $this->variant->public_id,
            'entry_uom_id' => $this->uomKg->public_id,
            'entry_quantity' => 12,
        ])->assertStatus(200)->json('data');

        $this->assertEquals(100, $data['source_on_hand']);
        $this->assertEquals(15, $data['source_reserved']);
        $this->assertEquals(85, $data['source_available']);
        $this->assertEquals(12, $data['entry_quantity']);
        $this->assertEquals('KG', $data['entry_uom']);
        $this->assertEquals(12, $data['base_quantity']);
        $this->assertEquals('KG', $data['base_uom']);
        $this->assertFalse($data['conversion_applies']);

        $this->assertEquals(100.0, (float) Stock::where('inventory_location_id', $this->location->id)->value('on_hand'));
        $this->assertDatabaseCount('stock_transfers', 0);
        $this->assertDatabaseCount('stock_transfer_lines', 0);
    }

    #[Test]
    public function it_previews_a_converted_entry_matching_what_creating_a_draft_would_persist(): void
    {
        $this->seedSourceStock(onHand: 50);

        $previewData = $this->postJson('/api/v1/inventory/transfers/preview', [
            'source_location_id' => $this->location->public_id,
            'item_variant_id' => $this->variant->public_id,
            'entry_uom_id' => $this->uomGr->public_id,
            'entry_quantity' => 25000,
        ])->assertStatus(200)->json('data');

        $this->assertEquals(25, $previewData['base_quantity']);
        $this->assertEquals('KG', $previewData['base_uom']);
        $this->assertTrue($previewData['conversion_applies']);

        $draft = $this->postJson('/api/v1/inventory/transfers', [
            'source_location_id' => $this->location->public_id,
            'destination_location_id' => $this->destination->public_id,
            'transfer_date' => '2026-09-15',
            'lines' => [[
                'item_variant_id' => $this->variant->public_id,
                'entry_uom_id' => $this->uomGr->public_id,
                'entry_quantity' => 25000,
            ]],
        ])->assertCreated()->json('data');

        $this->assertEquals($previewData['base_quantity'], $draft['lines'][0]['base_quantity']);
    }

    #[Test]
    public function it_previews_zero_availability_when_the_source_has_no_stock_row(): void
    {
        $data = $this->postJson('/api/v1/inventory/transfers/preview', [
            'source_location_id' => $this->location->public_id,
            'item_variant_id' => $this->variant->public_id,
            'entry_uom_id' => $this->uomKg->public_id,
            'entry_quantity' => 5,
        ])->assertStatus(200)->json('data');

        $this->assertEquals(0, $data['source_on_hand']);
        $this->assertEquals(0, $data['source_reserved']);
        $this->assertEquals(0, $data['source_available']);
        $this->assertEquals(5, $data['base_quantity']);

        $this->assertEquals(0, Stock::count());
    }

    #[Test]
    public function it_rejects_a_preview_with_no_conversion_path_as_422(): void
    {
        $uomLiter = UnitOfMeasure::create([
            'code' => 'L',
            'name' => 'Liter',
            'symbol' => 'L',
            'type' => 'VOLUME',
            'precision' => 2,
            'is_base' => true,
            'is_active' => true,
        ]);

        $this->postJson('/api/v1/inventory/transfers/preview', [
            'source_location_id' => $this->location->public_id,
            'item_variant_id' => $this->variant->public_id,
            'entry_uom_id' => $uomLiter->public_id,
            'entry_quantity' => 10,
        ])->assertStatus(422)->assertJsonValidationErrors(['entry_uom_id']);
    }

    #[Test]
    public function it_rejects_an_inactive_source_location(): void
    {
        $inactiveLocation = InventoryLocation::create([
            'operating_unit_id' => $this->operatingUnit->id,
            'name' => 'Decommissioned Warehouse',
            'type' => 'MAIN',
            'priority' => 10,
            'is_active' => false,
        ]);

        $this->postJson('/api/v1/inventory/transfers/preview', [
            'source_location_id' => $inactiveLocation->public_id,
            'item_variant_id' => $this->variant->public_id,
            'entry_uom_id' => $this->uomKg->public_id,
            'entry_quantity' => 10,
        ])->assertStatus(422)->assertJsonValidationErrors(['source_location_id']);
    }

    #[Test]
    public function it_forbids_a_preview_for_a_location_the_caller_cannot_access(): void
    {
        $otherUnit = OperatingUnit::create([
            'branch_id' => $this->branch->id,
            'type' => 'BRANCH_MAIN',
            'name' => 'Unrelated Operating Unit',
            'is_active' => true,
        ]);
        $foreignLocation = InventoryLocation::create([
            'operating_unit_id' => $otherUnit->id,
            'name' => 'Foreign Warehouse',
            'type' => 'MAIN',
            'priority' => 50,
            'is_active' => true,
        ]);

        $this->postJson('/api/v1/inventory/transfers/preview', [
            'source_location_id' => $foreignLocation->public_id,
            'item_variant_id' => $this->variant->public_id,
            'entry_uom_id' => $this->uomKg->public_id,
            'entry_quantity' => 10,
        ])->assertStatus(422)->assertJsonValidationErrors(['source_location_id']);
    }

    #[Test]
    public function it_forbids_a_preview_without_stock_manage(): void
    {
        $this->user->removeRole('inventory-manager');
        $this->user->syncPermissions(['stock.view']);

        $this->postJson('/api/v1/inventory/transfers/preview', [
            'source_location_id' => $this->location->public_id,
            'item_variant_id' => $this->variant->public_id,
            'entry_uom_id' => $this->uomKg->public_id,
            'entry_quantity' => 10,
        ])->assertStatus(403);

        $this->assertEquals(0, Stock::count());
    }
}
