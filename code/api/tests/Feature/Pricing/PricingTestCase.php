<?php

namespace Tests\Feature\Pricing;

use App\Models\Branch;
use App\Models\Item;
use App\Models\ItemVariant;
use App\Models\OperatingUnit;
use App\Models\PriceList;
use App\Models\PriceListAssignment;
use App\Models\UnitOfMeasure;
use App\Models\User;
use App\Models\VariantPrice;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Passport\Passport;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

abstract class PricingTestCase extends TestCase
{
    use RefreshDatabase;

    protected function createBranch(array $attributes = []): Branch
    {
        return Branch::create(array_merge([
            'code' => 'BR-'.uniqid(),
            'name' => 'Test Branch',
            'is_active' => true,
        ], $attributes));
    }

    protected function createOperatingUnit(Branch $branch, array $attributes = []): OperatingUnit
    {
        return OperatingUnit::create(array_merge([
            'branch_id' => $branch->id,
            'name' => 'Test Operating Unit',
            'type' => OperatingUnit::TYPE_BRANCH_MAIN,
            'is_active' => true,
        ], $attributes));
    }

    protected function createItemVariant(array $attributes = []): ItemVariant
    {
        $uom = UnitOfMeasure::create([
            'code' => 'UN-'.uniqid(),
            'name' => 'Unit',
            'symbol' => 'u',
            'type' => 'COUNT',
            'precision' => 0,
            'is_base' => true,
            'is_active' => true,
        ]);

        $item = Item::create([
            'sku' => 'SKU-'.uniqid(),
            'name' => 'Test Item',
            'type' => 'INSUMO',
            'is_stocked' => true,
            'is_perishable' => false,
            'is_active' => true,
        ]);

        return ItemVariant::create(array_merge([
            'item_id' => $item->id,
            'code' => 'VAR-'.uniqid(),
            'name' => 'Test Variant',
            'uom_id' => $uom->id,
            'is_active' => true,
        ], $attributes));
    }

    protected function createPriceList(array $attributes = []): PriceList
    {
        return PriceList::create(array_merge([
            'code' => 'PL-'.uniqid(),
            'name' => 'Test Price List',
            'priority' => 0,
            'is_active' => true,
        ], $attributes));
    }

    protected function createAssignment(PriceList $priceList, Branch $branch, ?OperatingUnit $operatingUnit = null, array $attributes = []): PriceListAssignment
    {
        return PriceListAssignment::create(array_merge([
            'price_list_id' => $priceList->id,
            'branch_id' => $branch->id,
            'operating_unit_id' => $operatingUnit?->id,
            'effective_from' => '2020-01-01',
            'effective_to' => null,
            'is_active' => true,
        ], $attributes));
    }

    protected function createVariantPrice(ItemVariant $variant, PriceList $priceList, array $attributes = []): VariantPrice
    {
        return VariantPrice::create(array_merge([
            'item_variant_id' => $variant->id,
            'price_list_id' => $priceList->id,
            'price' => '100.0000',
            'effective_from' => '2020-01-01',
            'effective_to' => null,
            'is_active' => true,
        ], $attributes));
    }

    /**
     * @param  string|list<string>  $permissions
     */
    protected function actingAsUserWithBranchAccess(Branch $branch, string|array $permissions): User
    {
        $user = $this->userWithPermissions($permissions);

        $operatingUnit = $this->createOperatingUnit($branch, ['name' => 'Access Operating Unit']);

        $user->operatingUnits()->attach($operatingUnit->id, [
            'assignment_role' => 'OWNER',
            'is_active' => true,
        ]);

        Passport::actingAs($user);

        return $user;
    }

    /**
     * @param  string|list<string>  $permissions
     */
    protected function actingAsUserWithoutBranchAccess(string|array $permissions): User
    {
        $user = $this->userWithPermissions($permissions);

        Passport::actingAs($user);

        return $user;
    }

    /**
     * @param  string|list<string>  $permissions
     */
    protected function userWithPermissions(string|array $permissions): User
    {
        $role = Role::firstOrCreate(['name' => 'pricing-test-role', 'guard_name' => 'api']);

        foreach ((array) $permissions as $permission) {
            Permission::firstOrCreate(['name' => $permission, 'guard_name' => 'api']);
            $role->givePermissionTo($permission);
        }

        $user = User::factory()->create();
        $user->assignRole('pricing-test-role');

        return $user;
    }
}
