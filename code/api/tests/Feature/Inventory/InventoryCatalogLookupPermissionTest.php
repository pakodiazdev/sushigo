<?php

namespace Tests\Feature\Inventory;

use App\Models\InventoryLocation;
use App\Models\OperatingUnit;
use App\Models\Supplier;
use App\Models\SupplierOffering;
use App\Models\VariantPurchasePresentation;
use PHPUnit\Framework\Attributes\Test;
use Spatie\Permission\Models\Role;

/**
 * Permission matrix for the reference-data lookup contract (#580,
 * App\Support\InventoryCatalogLookup) across every route it gates: Products, Variants, Variant
 * Purchase Presentations, Inventory Locations, Suppliers, and Supplier Offerings.
 */
class InventoryCatalogLookupPermissionTest extends InventoryTestCase
{
    private Supplier $supplier;

    private VariantPurchasePresentation $presentation;

    /** @var array<string, string> */
    private array $endpoints;

    protected function setUp(): void
    {
        parent::setUp();

        $product = $this->createProduct();
        $variant = $this->createItemVariant($product);
        $template = $this->createPurchasePresentationTemplate([
            'compatible_dimension_uom_id' => $variant->uom_id,
        ]);
        $this->presentation = $this->createVariantPurchasePresentation($variant, $template);

        $this->supplier = $this->createSupplier();
        SupplierOffering::create([
            'supplier_id' => $this->supplier->id,
            'variant_purchase_presentation_id' => $this->presentation->id,
            'supplier_code' => 'CODE-'.uniqid(),
            'quoted_price' => 100,
            'currency' => 'MXN',
            'minimum_order_quantity' => 1,
            'lead_time_days' => 2,
            'is_active' => true,
        ]);

        // Every lookup URL, keyed for readable failure messages.
        $this->endpoints = [
            'products.list' => '/api/v1/inventory/products',
            'products.variants.list' => "/api/v1/inventory/products/{$product->public_id}/variants",
            'products.variants.purchase-presentations.list' => "/api/v1/inventory/products/{$product->public_id}/variants/{$variant->public_id}/purchase-presentations",
            'inventory-locations.list' => '/api/v1/inventory-locations',
            'suppliers.list' => '/api/v1/inventory/suppliers',
            'suppliers.offerings.list' => "/api/v1/inventory/suppliers/{$this->supplier->public_id}/offerings",
        ];
    }

    private function assertAllEndpointsOk(): void
    {
        foreach ($this->endpoints as $name => $url) {
            $this->getJson($url)->assertOk("Expected 200 on {$name} ({$url})");
        }
    }

    private function assertAllEndpointsForbidden(): void
    {
        foreach ($this->endpoints as $name => $url) {
            $this->getJson($url)->assertForbidden("Expected 403 on {$name} ({$url})");
        }
    }

    // ── Catalog viewer (items.view only) ───────────────────────────────────

    #[Test]
    public function catalog_viewer_can_reach_product_lookups_but_not_supplier_or_location_lookups(): void
    {
        $this->user->removeRole('inventory-manager');
        $this->user->givePermissionTo('items.view');

        $this->getJson($this->endpoints['products.list'])->assertOk();
        $this->getJson($this->endpoints['products.variants.list'])->assertOk();
        $this->getJson($this->endpoints['products.variants.purchase-presentations.list'])->assertOk();

        // items.view is not part of the Locations/Suppliers lookup lists — it must not leak into
        // those domains (least privilege).
        $this->getJson($this->endpoints['inventory-locations.list'])->assertForbidden();
        $this->getJson($this->endpoints['suppliers.list'])->assertForbidden();
        $this->getJson($this->endpoints['suppliers.offerings.list'])->assertForbidden();
    }

    // ── Supplier manager (suppliers.manage only — #505's original consumer) ─

    #[Test]
    public function supplier_manager_can_reach_product_lookups_without_items_view(): void
    {
        $this->user->removeRole('inventory-manager');
        $this->user->givePermissionTo('suppliers.manage');

        $this->getJson($this->endpoints['products.list'])->assertOk();
        $this->getJson($this->endpoints['products.variants.list'])->assertOk();
        $this->getJson($this->endpoints['products.variants.purchase-presentations.list'])->assertOk();

        // suppliers.manage was never part of the Locations lookup list either before or after
        // this contract — unrelated to #580, preserved as-is.
        $this->getJson($this->endpoints['inventory-locations.list'])->assertForbidden();
    }

    // ── Receipt manager (receipts.manage only — #433's original consumer) ──

    #[Test]
    public function receipt_manager_can_reach_every_lookup_route_without_the_domain_view_permission(): void
    {
        $this->user->removeRole('inventory-manager');
        $this->user->givePermissionTo('receipts.manage');

        $this->assertAllEndpointsOk();
    }

    // ── Future Inventory operator (the new generic permission, alone) ──────

    #[Test]
    public function a_user_granted_only_the_generic_lookup_permission_can_reach_every_lookup_route(): void
    {
        $this->user->removeRole('inventory-manager');
        $this->user->givePermissionTo('inventory_catalog.lookup');

        $this->assertAllEndpointsOk();
    }

    #[Test]
    public function the_generic_lookup_permission_alone_grants_no_write_access(): void
    {
        $this->user->removeRole('inventory-manager');
        $this->user->givePermissionTo('inventory_catalog.lookup');

        $this->postJson('/api/v1/inventory/products', ['name' => 'Sneaky'])->assertForbidden();
        $this->postJson('/api/v1/inventory/suppliers', ['code' => 'SNEAKY', 'name' => 'Sneaky'])->assertForbidden();
        $this->postJson('/api/v1/inventory-locations', ['name' => 'Sneaky', 'type' => 'MAIN'])->assertForbidden();
    }

    // ── Unauthorized user ────────────────────────────────────────────────

    #[Test]
    public function a_user_with_no_relevant_permission_is_forbidden_on_every_lookup_route(): void
    {
        $this->user->removeRole('inventory-manager');

        $this->assertAllEndpointsForbidden();
    }

    // ── Inactive Operating Unit membership ──────────────────────────────

    #[Test]
    public function the_generic_lookup_permission_does_not_bypass_operating_unit_scoping(): void
    {
        $foreignUnit = OperatingUnit::create([
            'branch_id' => $this->branch->id,
            'type' => OperatingUnit::TYPE_EVENT_TEMP,
            'name' => 'Foreign Unit',
            'is_active' => true,
        ]);
        $foreignLocation = InventoryLocation::create([
            'operating_unit_id' => $foreignUnit->id,
            'name' => 'Foreign Warehouse',
            'type' => 'MAIN',
            'priority' => 100,
            'is_active' => true,
        ]);

        $this->user->removeRole('inventory-manager');
        $this->user->givePermissionTo('inventory_catalog.lookup');

        $ids = collect($this->getJson('/api/v1/inventory-locations')->assertOk()->json('data'))->pluck('id');
        $this->assertContains($this->location->public_id, $ids);
        $this->assertNotContains($foreignLocation->public_id, $ids);

        // Deactivating the caller's own membership removes it too — the lookup permission grants
        // read access to the catalog, not a bypass of the Operating Unit boundary itself.
        $this->user->operatingUnits()->updateExistingPivot($this->operatingUnit->id, ['is_active' => false]);
        $this->assertEmpty($this->getJson('/api/v1/inventory-locations')->assertOk()->json('data'));
    }

    // ── Admin bypass (regression guard — unaffected by #580) ────────────

    #[Test]
    public function admin_and_super_admin_are_unaffected_by_the_new_contract(): void
    {
        $domainViewPermissions = ['items.view', 'suppliers.view', 'inventory_locations.view'];

        foreach (['admin', 'super-admin'] as $roleName) {
            $role = Role::firstOrCreate(['name' => $roleName, 'guard_name' => 'api']);
            $role->syncPermissions($domainViewPermissions);
            $this->user->syncRoles([$roleName]);

            $this->assertAllEndpointsOk();
        }
    }
}
