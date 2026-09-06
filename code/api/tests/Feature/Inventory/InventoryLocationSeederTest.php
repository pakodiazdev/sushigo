<?php

namespace Tests\Feature\Inventory;

use App\Models\Branch;
use App\Models\InventoryLocation;
use App\Models\OperatingUnit;
use Database\Seeders\InventoryLocationSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

/**
 * `InventoryLocationSeeder` runs on every production container start
 * (`db:seed --force`). It may set the primary MAIN warehouse's
 * `can_receive_purchases` on first creation, but must never overwrite an
 * operator's later toggle of that operational flag (#572).
 */
class InventoryLocationSeederTest extends TestCase
{
    use RefreshDatabase;

    private OperatingUnit $mainUnit;

    protected function setUp(): void
    {
        parent::setUp();

        $branch = Branch::create([
            'code' => 'SEED', 'name' => 'Seed Branch', 'address' => 'x', 'city' => 'x',
            'state' => 'x', 'country' => 'MX', 'postal_code' => '00000', 'is_active' => true,
        ]);

        $this->mainUnit = OperatingUnit::create([
            'branch_id' => $branch->id,
            'type' => OperatingUnit::TYPE_BRANCH_MAIN,
            'name' => 'Seed Main Inventory',
            'is_active' => true,
        ]);
    }

    private function primaryMain(): InventoryLocation
    {
        return InventoryLocation::where('operating_unit_id', $this->mainUnit->id)
            ->where('type', InventoryLocation::TYPE_MAIN)
            ->firstOrFail();
    }

    #[Test]
    public function it_opts_the_primary_main_warehouse_into_purchase_receiving_on_first_seed(): void
    {
        $this->seed(InventoryLocationSeeder::class);

        $this->assertTrue($this->primaryMain()->can_receive_purchases);
    }

    #[Test]
    public function it_does_not_re_enable_receiving_that_an_operator_disabled(): void
    {
        $this->seed(InventoryLocationSeeder::class);

        // Operator turns purchase receiving off for the primary warehouse.
        $this->primaryMain()->update(['can_receive_purchases' => false]);

        // Container restarts — the seeder runs again.
        $this->seed(InventoryLocationSeeder::class);

        $this->assertFalse($this->primaryMain()->fresh()->can_receive_purchases);
    }

    #[Test]
    public function it_leaves_the_non_main_locations_non_receiving(): void
    {
        $this->seed(InventoryLocationSeeder::class);

        $kitchen = InventoryLocation::where('operating_unit_id', $this->mainUnit->id)
            ->where('type', InventoryLocation::TYPE_KITCHEN)
            ->firstOrFail();

        $this->assertFalse($kitchen->can_receive_purchases);
    }
}
