<?php

namespace Tests\Feature\Inventory;

use App\Models\InventoryLocation;
use App\Models\OperatingUnit;
use App\Models\Stock;
use App\Models\UnitOfMeasure;
use Illuminate\Foundation\Testing\RefreshDatabase;
use PHPUnit\Framework\Attributes\Test;

/**
 * The non-mutating preview endpoint (#570) the Existencias form calls to show
 * the operator the normalized base quantity, base unit cost, and total value
 * before they post — computed by the exact same conversion contract the real
 * posting uses, so what the form shows matches what the ledger records.
 */
class OpeningBalancePreviewTest extends InventoryTestCase
{
    use RefreshDatabase;

    #[Test]
    public function it_previews_a_same_uom_entry_without_posting_anything()
    {
        $item = $this->createItem(['name' => 'Tuna']);
        $variant = $this->createItemVariant($item, ['uom_id' => $this->uomKg->id]);

        $data = $this->postJson('/api/v1/inventory/opening-balance/preview', [
            'inventory_location_id' => $this->location->public_id,
            'item_variant_id' => $variant->public_id,
            'quantity' => 40,
            'uom_id' => $this->uomKg->public_id,
            'unit_cost' => 12.5,
        ])->assertStatus(200)->json('data');

        $this->assertEquals(40, $data['entry_quantity']);
        $this->assertEquals('KG', $data['entry_uom']);
        $this->assertEquals(40, $data['base_quantity']);
        $this->assertEquals('KG', $data['base_uom']);
        $this->assertFalse($data['conversion_applies']);
        $this->assertEquals(12.5, $data['base_unit_cost']);
        $this->assertEquals(500, $data['total_value']);

        $this->assertDatabaseCount('stock_movements', 0);
        $this->assertEquals(0, Stock::count());
    }

    #[Test]
    public function it_previews_a_converted_entry_matching_the_posted_result()
    {
        $item = $this->createItem(['name' => 'Rice']);
        $variant = $this->createItemVariant($item, ['uom_id' => $this->uomKg->id]);

        $previewData = $this->postJson('/api/v1/inventory/opening-balance/preview', [
            'inventory_location_id' => $this->location->public_id,
            'item_variant_id' => $variant->public_id,
            'quantity' => 25000, // grams
            'uom_id' => $this->uomGr->public_id,
            'unit_cost' => 0.15, // per gram
        ])->assertStatus(200)->json('data');

        $this->assertEquals(25, $previewData['base_quantity']);
        $this->assertEquals('KG', $previewData['base_uom']);
        $this->assertTrue($previewData['conversion_applies']);
        $this->assertEqualsWithDelta(150, $previewData['base_unit_cost'], 0.0001);
        $this->assertEqualsWithDelta(3750, $previewData['total_value'], 0.0001);

        // Posting the same payload lands the exact numbers the preview showed.
        $posted = $this->postJson('/api/v1/inventory/opening-balance', [
            'inventory_location_id' => $this->location->public_id,
            'item_variant_id' => $variant->public_id,
            'quantity' => 25000,
            'uom_id' => $this->uomGr->public_id,
            'unit_cost' => 0.15,
        ])->assertStatus(201)->json('data');

        $this->assertEquals($previewData['base_quantity'], $posted['base_quantity']);
        $this->assertEquals($previewData['base_unit_cost'], $posted['base_cost']);
    }

    #[Test]
    public function it_previews_a_missing_unit_cost_as_a_null_valuation()
    {
        $item = $this->createItem();
        $variant = $this->createItemVariant($item, ['uom_id' => $this->uomKg->id]);

        $data = $this->postJson('/api/v1/inventory/opening-balance/preview', [
            'inventory_location_id' => $this->location->public_id,
            'item_variant_id' => $variant->public_id,
            'quantity' => 10,
            'uom_id' => $this->uomKg->public_id,
        ])->assertStatus(200)->json('data');

        $this->assertEquals(10, $data['base_quantity']);
        $this->assertNull($data['base_unit_cost']);
        $this->assertNull($data['total_value']);
    }

    #[Test]
    public function it_rejects_a_preview_with_no_conversion_path_as_422()
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

        $item = $this->createItem();
        $variant = $this->createItemVariant($item, ['uom_id' => $this->uomKg->id]);

        $this->postJson('/api/v1/inventory/opening-balance/preview', [
            'inventory_location_id' => $this->location->public_id,
            'item_variant_id' => $variant->public_id,
            'quantity' => 10,
            'uom_id' => $uomLiter->public_id,
            'unit_cost' => 50,
        ])->assertStatus(422)->assertJsonValidationErrors(['uom_id']);
    }

    #[Test]
    public function it_rejects_a_base_quantity_that_rounds_to_zero_on_both_paths()
    {
        // 0.01 GR at the 0.001 GR->KG factor is 0.00001 KG, which rounds to
        // 0.0000 in the ledger's decimal(15,4) and would trip the qty > 0 CHECK
        // as an uncaught 500. Preview and posting must both reject it as a 422
        // on `quantity` instead.
        $item = $this->createItem();
        $variant = $this->createItemVariant($item, ['uom_id' => $this->uomKg->id]);

        $payload = [
            'inventory_location_id' => $this->location->public_id,
            'item_variant_id' => $variant->public_id,
            'quantity' => 0.01,
            'uom_id' => $this->uomGr->public_id,
            'unit_cost' => 5,
        ];

        $this->postJson('/api/v1/inventory/opening-balance/preview', $payload)
            ->assertStatus(422)
            ->assertJsonValidationErrors(['quantity']);
        $this->postJson('/api/v1/inventory/opening-balance', $payload)
            ->assertStatus(422)
            ->assertJsonValidationErrors(['quantity']);

        $this->assertDatabaseCount('stock_movements', 0);
    }

    #[Test]
    public function it_rejects_an_entry_quantity_that_rounds_to_zero_even_when_conversion_would_make_the_base_quantity_positive()
    {
        // 0.00001 KG converts to 0.01 GR, but stock_movement_lines.qty is
        // decimal(15,4) and would persist the original quantity as zero.
        $item = $this->createItem();
        $variant = $this->createItemVariant($item, ['uom_id' => $this->uomGr->id]);

        $payload = [
            'inventory_location_id' => $this->location->public_id,
            'item_variant_id' => $variant->public_id,
            'quantity' => 0.00001,
            'uom_id' => $this->uomKg->public_id,
        ];

        $this->postJson('/api/v1/inventory/opening-balance/preview', $payload)
            ->assertStatus(422)
            ->assertJsonValidationErrors(['quantity']);
        $this->postJson('/api/v1/inventory/opening-balance', $payload)
            ->assertStatus(422)
            ->assertJsonValidationErrors(['quantity']);

        $this->assertDatabaseCount('stock_movements', 0);
    }

    #[Test]
    public function it_rejects_a_quantity_that_exceeds_the_ledger_decimal_range_on_both_paths()
    {
        $item = $this->createItem();
        $variant = $this->createItemVariant($item, ['uom_id' => $this->uomKg->id]);

        $payload = [
            'inventory_location_id' => $this->location->public_id,
            'item_variant_id' => $variant->public_id,
            // decimal(15,4) has eleven integer digits.
            'quantity' => 100_000_000_000,
            'uom_id' => $this->uomKg->public_id,
        ];

        $this->postJson('/api/v1/inventory/opening-balance/preview', $payload)
            ->assertStatus(422)
            ->assertJsonValidationErrors(['quantity']);
        $this->postJson('/api/v1/inventory/opening-balance', $payload)
            ->assertStatus(422)
            ->assertJsonValidationErrors(['quantity']);

        $this->assertDatabaseCount('stock_movements', 0);
    }

    #[Test]
    public function it_rejects_a_quantity_that_would_overflow_the_accumulated_stock_on_both_paths()
    {
        $item = $this->createItem();
        $variant = $this->createItemVariant($item, ['uom_id' => $this->uomKg->id]);
        Stock::create([
            'inventory_location_id' => $this->location->id,
            'item_variant_id' => $variant->id,
            'on_hand' => 99_999_999_999,
            'reserved' => 0,
        ]);

        $payload = [
            'inventory_location_id' => $this->location->public_id,
            'item_variant_id' => $variant->public_id,
            'quantity' => 1,
            'uom_id' => $this->uomKg->public_id,
        ];

        $this->postJson('/api/v1/inventory/opening-balance/preview', $payload)
            ->assertStatus(422)
            ->assertJsonValidationErrors(['quantity']);
        $this->postJson('/api/v1/inventory/opening-balance', $payload)
            ->assertStatus(422)
            ->assertJsonValidationErrors(['quantity']);

        $this->assertDatabaseCount('stock_movements', 0);
        $this->assertEquals(99_999_999_999, (float) Stock::first()->on_hand);
    }

    #[Test]
    public function it_rejects_a_converted_unit_cost_that_exceeds_the_ledger_range_on_both_paths()
    {
        $item = $this->createItem();
        $variant = $this->createItemVariant($item, ['uom_id' => $this->uomKg->id]);

        $payload = [
            'inventory_location_id' => $this->location->public_id,
            'item_variant_id' => $variant->public_id,
            'quantity' => 1,
            'uom_id' => $this->uomGr->public_id,
            // Dividing by the 0.001 GR -> KG factor produces a base cost of
            // 100,000,000,000, one unit beyond decimal(15,4).
            'unit_cost' => 100_000_000,
        ];

        $this->postJson('/api/v1/inventory/opening-balance/preview', $payload)
            ->assertStatus(422)
            ->assertJsonValidationErrors(['unit_cost']);
        $this->postJson('/api/v1/inventory/opening-balance', $payload)
            ->assertStatus(422)
            ->assertJsonValidationErrors(['unit_cost']);

        $this->assertDatabaseCount('stock_movements', 0);
    }

    #[Test]
    public function it_rejects_a_total_value_that_exceeds_the_ledger_range_on_both_paths()
    {
        $item = $this->createItem();
        $variant = $this->createItemVariant($item, ['uom_id' => $this->uomKg->id]);

        $payload = [
            'inventory_location_id' => $this->location->public_id,
            'item_variant_id' => $variant->public_id,
            'quantity' => 60_000_000_000,
            'uom_id' => $this->uomKg->public_id,
            'unit_cost' => 2,
        ];

        $this->postJson('/api/v1/inventory/opening-balance/preview', $payload)
            ->assertStatus(422)
            ->assertJsonValidationErrors(['unit_cost']);
        $this->postJson('/api/v1/inventory/opening-balance', $payload)
            ->assertStatus(422)
            ->assertJsonValidationErrors(['unit_cost']);

        $this->assertDatabaseCount('stock_movements', 0);
    }

    #[Test]
    public function it_rejects_a_preview_for_an_inactive_destination_matching_the_posting_path()
    {
        $inactiveLocation = InventoryLocation::create([
            'operating_unit_id' => $this->operatingUnit->id,
            'name' => 'Decommissioned Warehouse',
            'type' => 'MAIN',
            'priority' => 10,
            'is_active' => false,
        ]);

        $item = $this->createItem();
        $variant = $this->createItemVariant($item, ['uom_id' => $this->uomKg->id]);

        $payload = [
            'inventory_location_id' => $inactiveLocation->public_id,
            'item_variant_id' => $variant->public_id,
            'quantity' => 10,
            'uom_id' => $this->uomKg->public_id,
            'unit_cost' => 5,
        ];

        // The preview must not show a valid-looking summary for a payload the
        // posting endpoint would reject.
        $this->postJson('/api/v1/inventory/opening-balance/preview', $payload)
            ->assertStatus(422)
            ->assertJsonValidationErrors(['inventory_location_id']);
        $this->postJson('/api/v1/inventory/opening-balance', $payload)
            ->assertStatus(422)
            ->assertJsonValidationErrors(['inventory_location_id']);
    }

    #[Test]
    public function it_forbids_a_preview_for_a_location_the_caller_cannot_access()
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

        $item = $this->createItem();
        $variant = $this->createItemVariant($item, ['uom_id' => $this->uomKg->id]);

        $this->postJson('/api/v1/inventory/opening-balance/preview', [
            'inventory_location_id' => $foreignLocation->public_id,
            'item_variant_id' => $variant->public_id,
            'quantity' => 10,
            'uom_id' => $this->uomKg->public_id,
        ])->assertStatus(403);
    }

    #[Test]
    public function it_forbids_a_preview_without_stock_manage()
    {
        $this->user->removeRole('inventory-manager');
        $this->user->syncPermissions(['stock.view']);

        $item = $this->createItem();
        $variant = $this->createItemVariant($item, ['uom_id' => $this->uomKg->id]);

        $this->postJson('/api/v1/inventory/opening-balance/preview', [
            'inventory_location_id' => $this->location->public_id,
            'item_variant_id' => $variant->public_id,
            'quantity' => 10,
            'uom_id' => $this->uomKg->public_id,
        ])->assertStatus(403);

        $this->assertDatabaseCount('stock_movements', 0);
    }
}
