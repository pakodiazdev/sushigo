<?php

namespace Tests\Unit\Services;

use App\Models\Branch;
use App\Models\InventoryLocation;
use App\Models\Item;
use App\Models\ItemVariant;
use App\Models\OperatingUnit;
use App\Models\UnitOfMeasure;
use App\Models\VariantLocationReplenishmentPolicy;
use App\Services\Inventory\ReplenishmentPolicyResolver;
use Illuminate\Foundation\Testing\RefreshDatabase;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class ReplenishmentPolicyResolverTest extends TestCase
{
    use RefreshDatabase;

    private ReplenishmentPolicyResolver $resolver;

    private InventoryLocation $warehouse;

    private InventoryLocation $bar;

    private ItemVariant $variant;

    protected function setUp(): void
    {
        parent::setUp();

        $this->resolver = new ReplenishmentPolicyResolver;

        $branch = Branch::create([
            'code' => 'T', 'name' => 'T', 'address' => 'x', 'city' => 'x', 'state' => 'TS',
            'country' => 'MX', 'postal_code' => '1', 'is_active' => true,
        ]);
        $ou = OperatingUnit::create(['branch_id' => $branch->id, 'type' => 'BRANCH_MAIN', 'name' => 'OU', 'is_active' => true]);
        $this->warehouse = InventoryLocation::create(['operating_unit_id' => $ou->id, 'name' => 'WH', 'type' => 'MAIN', 'priority' => 100, 'is_active' => true]);
        $this->bar = InventoryLocation::create(['operating_unit_id' => $ou->id, 'name' => 'Bar', 'type' => 'BAR', 'priority' => 40, 'is_active' => true]);
        $uom = UnitOfMeasure::create(['code' => 'KG', 'name' => 'Kg', 'symbol' => 'kg', 'type' => 'WEIGHT', 'precision' => 3, 'is_base' => true, 'is_active' => true]);
        $item = Item::create(['sku' => 'S1', 'name' => 'I', 'type' => 'INSUMO', 'is_active' => true]);
        $this->variant = ItemVariant::create(['item_id' => $item->id, 'uom_id' => $uom->id, 'code' => 'V1', 'name' => 'V', 'is_active' => true]);
    }

    #[Test]
    public function resolve_returns_the_location_specific_policy(): void
    {
        VariantLocationReplenishmentPolicy::create(['inventory_location_id' => $this->warehouse->id, 'item_variant_id' => $this->variant->id, 'min_stock' => 12, 'max_stock' => 60]);
        VariantLocationReplenishmentPolicy::create(['inventory_location_id' => $this->bar->id, 'item_variant_id' => $this->variant->id, 'min_stock' => 3, 'max_stock' => 9]);

        $this->assertSame('12.0000', (string) $this->resolver->resolve($this->warehouse->id, $this->variant->id)->min_stock);
        $this->assertSame('3.0000', (string) $this->resolver->resolve($this->bar->id, $this->variant->id)->min_stock);
    }

    #[Test]
    public function resolve_returns_null_when_no_policy_is_configured(): void
    {
        $this->assertNull($this->resolver->resolve($this->warehouse->id, $this->variant->id));
    }

    #[Test]
    public function resolve_ignores_a_soft_deleted_policy(): void
    {
        $policy = VariantLocationReplenishmentPolicy::create(['inventory_location_id' => $this->warehouse->id, 'item_variant_id' => $this->variant->id, 'min_stock' => 5, 'max_stock' => 50]);
        $policy->delete();

        $this->assertNull($this->resolver->resolve($this->warehouse->id, $this->variant->id));
    }

    #[Test]
    public function is_low_needs_a_policy_and_an_on_hand_at_or_below_the_reorder_point(): void
    {
        $policy = new VariantLocationReplenishmentPolicy(['min_stock' => 10, 'max_stock' => 100]);

        $this->assertTrue($this->resolver->isLow(10.0, $policy));
        $this->assertTrue($this->resolver->isLow(4.0, $policy));
        $this->assertFalse($this->resolver->isLow(10.001, $policy));
        $this->assertFalse($this->resolver->isLow(0.0, null));
    }

    #[Test]
    public function batch_resolvers_key_by_the_expected_id(): void
    {
        VariantLocationReplenishmentPolicy::create(['inventory_location_id' => $this->warehouse->id, 'item_variant_id' => $this->variant->id, 'min_stock' => 7, 'max_stock' => 70]);

        $forLocation = $this->resolver->resolveManyForLocation($this->warehouse->id, [$this->variant->id, 999999]);
        $this->assertTrue($forLocation->has($this->variant->id));
        $this->assertSame('7.0000', (string) $forLocation->get($this->variant->id)->min_stock);

        $forVariant = $this->resolver->resolveManyForVariant($this->variant->id, [$this->warehouse->id, $this->bar->id]);
        $this->assertTrue($forVariant->has($this->warehouse->id));
        $this->assertFalse($forVariant->has($this->bar->id));
    }
}
