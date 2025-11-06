<?php

namespace Tests\Feature\Inventory;

use App\Models\Branch;
use App\Models\InventoryLocation;
use App\Models\Item;
use App\Models\ItemVariant;
use App\Models\OperatingUnit;
use App\Models\UnitOfMeasure;
use App\Models\UomConversion;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Passport\Passport;
use Tests\TestCase;

abstract class InventoryTestCase extends TestCase
{
    use RefreshDatabase;

    protected User $user;
    protected Branch $branch;
    protected OperatingUnit $operatingUnit;
    protected InventoryLocation $location;
    protected UnitOfMeasure $uomKg;
    protected UnitOfMeasure $uomGr;
    protected UomConversion $conversionKgGr;

    protected function setUp(): void
    {
        parent::setUp();

        // Create test user
        $this->user = User::factory()->create([
            'name' => 'Test User',
            'email' => 'test@sushigo.com',
        ]);

        // Create branch
        $this->branch = Branch::create([
            'code' => 'TEST',
            'name' => 'Test Branch',
            'address' => '123 Test St',
            'city' => 'Test City',
            'state' => 'TS',
            'country' => 'MX',
            'postal_code' => '12345',
            'is_active' => true,
        ]);

        // Create operating unit
        $this->operatingUnit = OperatingUnit::create([
            'branch_id' => $this->branch->id,
            'type' => 'BRANCH_MAIN',
            'name' => 'Test Main Inventory',
            'is_active' => true,
        ]);

        // Create inventory location
        $this->location = InventoryLocation::create([
            'operating_unit_id' => $this->operatingUnit->id,
            'name' => 'Test Warehouse',
            'type' => 'MAIN',
            'priority' => 100,
            'is_active' => true,
        ]);

        // Create units of measure
        $this->uomKg = UnitOfMeasure::create([
            'code' => 'KG',
            'name' => 'Kilogram',
            'symbol' => 'kg',
            'type' => 'WEIGHT',
            'precision' => 3,
            'is_base' => true,
            'is_active' => true,
        ]);

        $this->uomGr = UnitOfMeasure::create([
            'code' => 'GR',
            'name' => 'Gram',
            'symbol' => 'g',
            'type' => 'WEIGHT',
            'precision' => 2,
            'is_base' => false,
            'is_active' => true,
        ]);

        // Create conversion KG -> GR (1 KG = 1000 GR)
        $this->conversionKgGr = UomConversion::create([
            'from_uom_id' => $this->uomKg->id,
            'to_uom_id' => $this->uomGr->id,
            'factor' => 1000,
            'tolerance_percent' => 0.5,
            'is_active' => true,
        ]);

        // Authenticate user with Passport
        Passport::actingAs($this->user);
    }

    protected function createItem(array $attributes = []): Item
    {
        return Item::create(array_merge([
            'sku' => 'TEST-' . uniqid(),
            'name' => 'Test Item',
            'type' => 'INSUMO',
            'is_stocked' => true,
            'is_perishable' => false,
            'is_active' => true,
        ], $attributes));
    }

    protected function createItemVariant(Item $item, array $attributes = []): ItemVariant
    {
        return ItemVariant::create(array_merge([
            'item_id' => $item->id,
            'code' => 'VAR-' . uniqid(),
            'name' => 'Test Variant',
            'uom_id' => $this->uomKg->id,
            'min_stock' => 0,
            'max_stock' => 1000,
            'avg_unit_cost' => 0,
            'last_unit_cost' => 0,
            'is_active' => true,
        ], $attributes));
    }
}
