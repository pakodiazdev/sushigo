<?php

namespace Tests\Feature\Inventory;

use App\Models\Supplier;
use Laravel\Passport\Passport;
use PHPUnit\Framework\Attributes\Test;

class SupplierCrudTest extends InventoryTestCase
{
    #[Test]
    public function it_lists_and_filters_suppliers(): void
    {
        Supplier::create(['code' => 'ACTIVE', 'name' => 'Active Supplier', 'is_active' => true]);
        Supplier::create(['code' => 'INACTIVE', 'name' => 'Inactive Supplier', 'is_active' => false]);

        $this->getJson('/api/v1/inventory/suppliers?is_active=1&search=Active')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.code', 'ACTIVE');
    }

    #[Test]
    public function it_validates_supplier_list_filters(): void
    {
        $this->getJson('/api/v1/inventory/suppliers?search='.str_repeat('x', 101))
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['search']);
    }

    #[Test]
    public function it_creates_a_supplier_with_contact_data(): void
    {
        $response = $this->postJson('/api/v1/inventory/suppliers', [
            'code' => '  sushi-wholesale ',
            'name' => 'Sushi Wholesale SA',
            'contact_name' => 'Ana Pérez',
            'email' => 'purchases@example.com',
            'phone' => '+52 55 1234 5678',
        ]);

        $response->assertCreated()
            ->assertJsonPath('data.code', 'SUSHI-WHOLESALE')
            ->assertJsonPath('data.name', 'Sushi Wholesale SA')
            ->assertJsonPath('data.is_active', true)
            ->assertJsonStructure(['data' => ['id', 'code', 'name', 'contact_name', 'email', 'phone']]);

        $this->assertDatabaseHas('suppliers', [
            'code' => 'SUSHI-WHOLESALE',
            'email' => 'purchases@example.com',
        ]);
        $this->assertIsString($response->json('data.id'));
    }

    #[Test]
    public function it_shows_updates_and_deactivates_a_supplier_without_deleting_it(): void
    {
        $supplier = Supplier::create(['code' => 'ORIGINAL', 'name' => 'Original', 'is_active' => true]);

        $this->getJson("/api/v1/inventory/suppliers/{$supplier->public_id}")
            ->assertOk()
            ->assertJsonPath('data.id', $supplier->public_id);

        $this->putJson("/api/v1/inventory/suppliers/{$supplier->public_id}", [
            'code' => 'updated',
            'name' => 'Updated Supplier',
            'is_active' => false,
        ])->assertOk()
            ->assertJsonPath('data.code', 'UPDATED')
            ->assertJsonPath('data.is_active', false);

        $this->assertDatabaseHas('suppliers', [
            'id' => $supplier->id,
            'name' => 'Updated Supplier',
            'is_active' => false,
            'deleted_at' => null,
        ]);
    }

    #[Test]
    public function it_rejects_clearing_the_supplier_code_on_update(): void
    {
        $supplier = Supplier::create(['code' => 'ORIGINAL', 'name' => 'Original', 'is_active' => true]);

        $this->putJson("/api/v1/inventory/suppliers/{$supplier->public_id}", [
            'code' => '   ',
        ])->assertUnprocessable()
            ->assertJsonValidationErrors(['code']);

        $this->assertDatabaseHas('suppliers', ['id' => $supplier->id, 'code' => 'ORIGINAL']);
    }

    #[Test]
    public function it_validates_supplier_identity_and_contact_fields(): void
    {
        Supplier::create(['code' => 'DUPLICATE', 'name' => 'Existing', 'is_active' => true]);

        $this->postJson('/api/v1/inventory/suppliers', [
            'code' => 'duplicate',
            'name' => '',
            'email' => 'invalid',
            'phone' => str_repeat('1', 51),
        ])->assertUnprocessable()
            ->assertJsonValidationErrors(['code', 'name', 'email', 'phone']);
    }

    #[Test]
    public function it_requires_supplier_permissions(): void
    {
        $this->user->removeRole('inventory-manager');

        $this->getJson('/api/v1/inventory/suppliers')->assertForbidden();
        $this->postJson('/api/v1/inventory/suppliers', ['code' => 'NEW', 'name' => 'New'])->assertForbidden();
    }

    #[Test]
    public function it_allows_listing_with_receipts_manage_permission_but_not_suppliers_view(): void
    {
        Supplier::create(['code' => 'RECEIPT-SUP', 'name' => 'Receipt Supplier', 'is_active' => true]);
        $this->user->removeRole('inventory-manager');
        $this->user->givePermissionTo('receipts.manage');

        $this->getJson('/api/v1/inventory/suppliers')
            ->assertOk()
            ->assertJsonCount(1, 'data');
    }

    #[Test]
    public function it_soft_deletes_a_supplier_without_erasing_its_record(): void
    {
        $supplier = Supplier::create(['code' => 'ARCHIVE', 'name' => 'Archive Me', 'is_active' => false]);

        $this->deleteJson("/api/v1/inventory/suppliers/{$supplier->public_id}")
            ->assertNoContent();

        $this->assertSoftDeleted('suppliers', ['id' => $supplier->id]);
    }

    #[Test]
    public function it_requires_authentication(): void
    {
        Passport::actingAs($this->user);
        auth()->forgetGuards();

        $this->getJson('/api/v1/inventory/suppliers')->assertUnauthorized();
    }
}
