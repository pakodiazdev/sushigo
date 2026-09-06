<?php

namespace Tests\Feature\Api\V1\Stock;

use App\Models\InventoryLocation;
use App\Models\ItemVariant;
use App\Models\OperatingUnit;
use App\Models\Stock;
use App\Models\StockMovement;
use App\Models\User;
use App\Models\VariantLocationReplenishmentPolicy;
use Laravel\Passport\Passport;
use PHPUnit\Framework\Attributes\Test;
use Spatie\Permission\Models\Role;
use Tests\Feature\Inventory\InventoryTestCase;

/**
 * Existencias read model (#571): spined on the managed Variant-to-Location
 * assignment (#569), left-joining the optional physical Stock row. An assigned
 * pair with no Stock projects zero balances and `stock_id: null`; unassigned
 * and soft-deleted-assignment pairs never appear; reads write nothing.
 */
class AssignmentAwareExistenciasTest extends InventoryTestCase
{
    private InventoryLocation $bar;

    private ItemVariant $withStock;

    private ItemVariant $zeroWithPolicy;

    private ItemVariant $zeroNoPolicy;

    private ItemVariant $unassigned;

    private ItemVariant $softDeleted;

    protected function setUp(): void
    {
        parent::setUp();

        $this->bar = InventoryLocation::create([
            'operating_unit_id' => $this->operatingUnit->id,
            'name' => 'Bar Fridge',
            'type' => InventoryLocation::TYPE_BAR,
            'priority' => 40,
            'is_active' => true,
        ]);

        $item = $this->createItem();

        $this->withStock = $this->createItemVariant($item, ['code' => 'RICE-1KG', 'name' => 'Rice 1kg']);
        $this->zeroWithPolicy = $this->createItemVariant($item, ['code' => 'NORI-100', 'name' => 'Nori 100s']);
        $this->zeroNoPolicy = $this->createItemVariant($item, ['code' => 'WASABI-1', 'name' => 'Wasabi 1kg']);
        $this->unassigned = $this->createItemVariant($item, ['code' => 'GARI-1', 'name' => 'Gari 1kg']);
        $this->softDeleted = $this->createItemVariant($item, ['code' => 'SOY-5L', 'name' => 'Soy 5L']);

        // Assigned + materialized Stock.
        $this->assignVariantToLocation($this->location, $this->withStock);
        Stock::create([
            'inventory_location_id' => $this->location->id,
            'item_variant_id' => $this->withStock->id,
            'on_hand' => 100, 'reserved' => 10, 'weighted_avg_cost' => 50,
        ]);

        // Assigned, never received, with a live policy whose reorder point is 0.
        $this->assignVariantToLocation($this->location, $this->zeroWithPolicy);
        VariantLocationReplenishmentPolicy::create([
            'inventory_location_id' => $this->location->id,
            'item_variant_id' => $this->zeroWithPolicy->id,
            'min_stock' => 0, 'max_stock' => 20,
        ]);

        // Assigned, never received, no policy.
        $this->assignVariantToLocation($this->location, $this->zeroNoPolicy);

        // Not assigned anywhere.
        // (nothing)

        // Assignment that was soft-deleted (unassigned).
        $this->assignVariantToLocation($this->location, $this->softDeleted)->delete();
    }

    private function listRows(string $query = ''): array
    {
        return $this->getJson('/api/v1/stock'.$query)->assertOk()->json('data');
    }

    private function rowFor(array $rows, ItemVariant $variant): ?array
    {
        return collect($rows)->first(fn ($r) => $r['item_variant']['id'] === $variant->public_id);
    }

    #[Test]
    public function assigned_variant_with_no_stock_is_projected_as_zero(): void
    {
        $row = $this->rowFor($this->listRows(), $this->zeroNoPolicy);

        $this->assertNotNull($row, 'assigned zero-stock variant must appear');
        $this->assertNull($row['stock_id']);
        $this->assertNotNull($row['assignment_id']);
        $this->assertSame($row['assignment_id'], $row['id']);
        $this->assertEquals(0.0, $row['on_hand']);
        $this->assertEquals(0.0, $row['reserved']);
        $this->assertEquals(0.0, $row['available']);
        $this->assertEquals(0.0, $row['weighted_avg_cost']);
        $this->assertEquals(0.0, $row['total_value']);
        $this->assertNull($row['min_stock']);
        $this->assertFalse($row['is_low_stock']);
    }

    #[Test]
    public function materialized_stock_values_are_unchanged(): void
    {
        $row = $this->rowFor($this->listRows(), $this->withStock);

        $this->assertNotNull($row['stock_id']);
        $this->assertEquals(100.0, $row['on_hand']);
        $this->assertEquals(10.0, $row['reserved']);
        $this->assertEquals(90.0, $row['available']);
        $this->assertEquals(50.0, $row['weighted_avg_cost']);
        $this->assertEquals(5000.0, $row['total_value']);
    }

    #[Test]
    public function unassigned_and_soft_deleted_assignment_variants_are_absent(): void
    {
        $rows = $this->listRows();

        $this->assertNull($this->rowFor($rows, $this->unassigned));
        $this->assertNull($this->rowFor($rows, $this->softDeleted));
    }

    #[Test]
    public function projected_zero_row_is_low_only_with_a_live_policy_and_zero_min(): void
    {
        $rows = $this->listRows();

        $withPolicy = $this->rowFor($rows, $this->zeroWithPolicy);
        $this->assertEquals(0.0, $withPolicy['min_stock']);
        $this->assertTrue($withPolicy['is_low_stock']);

        $noPolicy = $this->rowFor($rows, $this->zeroNoPolicy);
        $this->assertNull($noPolicy['min_stock']);
        $this->assertFalse($noPolicy['is_low_stock']);
    }

    #[Test]
    public function low_stock_filter_includes_projected_zero_rows(): void
    {
        $rows = $this->listRows('?low_stock=1');

        $codes = collect($rows)->pluck('item_variant.id');
        $this->assertContains($this->zeroWithPolicy->public_id, $codes);
        $this->assertNotContains($this->zeroNoPolicy->public_id, $codes);
        $this->assertNotContains($this->withStock->public_id, $codes);
    }

    #[Test]
    public function min_on_hand_filter_drops_projected_zero_rows_only_above_zero(): void
    {
        $positive = collect($this->listRows('?min_on_hand=1'))->pluck('item_variant.id');
        $this->assertContains($this->withStock->public_id, $positive);
        $this->assertNotContains($this->zeroNoPolicy->public_id, $positive);

        $zero = collect($this->listRows('?min_on_hand=0'))->pluck('item_variant.id');
        $this->assertContains($this->zeroNoPolicy->public_id, $zero);
    }

    #[Test]
    public function location_and_variant_filters_scope_the_row_set(): void
    {
        $this->assignVariantToLocation($this->bar, $this->withStock);

        $barRows = $this->listRows('?inventory_location_id='.$this->bar->public_id);
        $this->assertCount(1, $barRows);
        $this->assertSame($this->bar->public_id, $barRows[0]['inventory_location']['id']);

        $variantRows = $this->listRows('?item_variant_id='.$this->zeroNoPolicy->public_id);
        $this->assertCount(1, $variantRows);
        $this->assertSame($this->zeroNoPolicy->public_id, $variantRows[0]['item_variant']['id']);
    }

    #[Test]
    public function pagination_counts_the_whole_assignment_aware_set(): void
    {
        $item = $this->createItem();
        for ($i = 0; $i < 12; $i++) {
            $this->assignVariantToLocation($this->location, $this->createItemVariant($item, ['code' => "BULK-{$i}"]));
        }

        $response = $this->getJson('/api/v1/stock?per_page=5')->assertOk();

        // 4 from setUp (withStock, zeroWithPolicy, zeroNoPolicy) — softDeleted excluded — + 12 bulk = 15.
        $this->assertSame(15, $response->json('meta.total'));
        $this->assertCount(5, $response->json('data'));
    }

    #[Test]
    public function per_page_accepts_the_dashboard_full_page_request(): void
    {
        // Existencias loads its whole assortment in one page (`per_page=500`);
        // the former max:100 silently 422'd that request (#571).
        $this->getJson('/api/v1/stock?per_page=500')->assertOk();
        $this->getJson('/api/v1/stock?per_page=501')->assertStatus(422);
    }

    #[Test]
    public function by_location_summary_counts_assigned_variants_not_stock_rows(): void
    {
        $response = $this->getJson('/api/v1/stock/by-location/'.$this->location->public_id)->assertOk();

        // 3 live assignments at the location (softDeleted excluded), only 1 with Stock.
        $this->assertSame(3, $response->json('data.summary.total_variants'));
        $this->assertEquals(100.0, $response->json('data.summary.total_on_hand'));
        $this->assertSame(1, $response->json('data.summary.low_stock_variants'));

        $items = collect($response->json('data.items'))->keyBy('item_variant_id');
        $this->assertNull($items[$this->zeroNoPolicy->public_id]['stock_id']);
        $this->assertEquals(0.0, $items[$this->zeroNoPolicy->public_id]['on_hand']);
        $this->assertNotNull($items[$this->withStock->public_id]['stock_id']);
    }

    #[Test]
    public function by_variant_summary_counts_assigned_locations_not_stock_rows(): void
    {
        // Same Variant assigned to a second location with no Stock there.
        $this->assignVariantToLocation($this->bar, $this->withStock);

        $response = $this->getJson('/api/v1/stock/by-variant/'.$this->withStock->public_id)->assertOk();

        $this->assertSame(2, $response->json('data.summary.total_locations'));
        $this->assertEquals(100.0, $response->json('data.summary.total_on_hand'));

        $byLocation = collect($response->json('data.locations'))->keyBy('inventory_location_id');
        $this->assertNotNull($byLocation[$this->location->public_id]['stock_id']);
        $this->assertNull($byLocation[$this->bar->public_id]['stock_id']);
        $this->assertEquals(0.0, $byLocation[$this->bar->public_id]['on_hand']);
    }

    #[Test]
    public function querying_existencias_is_side_effect_free(): void
    {
        $stockBefore = Stock::count();
        $movementsBefore = StockMovement::count();

        $this->getJson('/api/v1/stock')->assertOk();
        $this->getJson('/api/v1/stock/by-location/'.$this->location->public_id)->assertOk();
        $this->getJson('/api/v1/stock/by-variant/'.$this->zeroNoPolicy->public_id)->assertOk();

        $this->assertSame($stockBefore, Stock::count());
        $this->assertSame($movementsBefore, StockMovement::count());
        $this->assertDatabaseMissing('stock', [
            'inventory_location_id' => $this->location->id,
            'item_variant_id' => $this->zeroNoPolicy->id,
        ]);
    }

    #[Test]
    public function existencias_respects_operating_unit_scope(): void
    {
        $unitB = OperatingUnit::create([
            'branch_id' => $this->branch->id,
            'type' => OperatingUnit::TYPE_EVENT_TEMP,
            'name' => 'Foreign Unit',
            'is_active' => true,
        ]);
        $locationB = InventoryLocation::create([
            'operating_unit_id' => $unitB->id,
            'name' => 'Foreign Warehouse',
            'type' => 'MAIN',
            'priority' => 100,
            'is_active' => true,
        ]);
        $this->assignVariantToLocation($locationB, $this->zeroNoPolicy);

        $locationIds = collect($this->listRows())->pluck('inventory_location.id')->unique();
        $this->assertNotContains($locationB->public_id, $locationIds);

        $this->assertEmpty($this->listRows('?inventory_location_id='.$locationB->public_id));

        $this->getJson('/api/v1/stock/by-location/'.$locationB->public_id)->assertForbidden();
    }

    #[Test]
    public function admin_bypasses_operating_unit_scope_for_existencias(): void
    {
        $unitB = OperatingUnit::create([
            'branch_id' => $this->branch->id,
            'type' => OperatingUnit::TYPE_EVENT_TEMP,
            'name' => 'Foreign Unit',
            'is_active' => true,
        ]);
        $locationB = InventoryLocation::create([
            'operating_unit_id' => $unitB->id,
            'name' => 'Foreign Warehouse',
            'type' => 'MAIN',
            'priority' => 100,
            'is_active' => true,
        ]);
        $this->assignVariantToLocation($locationB, $this->zeroNoPolicy);

        Role::firstOrCreate(['name' => 'admin', 'guard_name' => 'api']);
        $admin = User::factory()->create();
        $admin->assignRole('admin');
        $admin->givePermissionTo('stock.view');
        Passport::actingAs($admin);

        $locationIds = collect($this->listRows())->pluck('inventory_location.id')->unique();
        $this->assertContains($locationB->public_id, $locationIds);
        $this->getJson('/api/v1/stock/by-location/'.$locationB->public_id)->assertOk();
    }
}
