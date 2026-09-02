<?php

namespace Tests\Feature\Inventory;

use App\DataTransferObjects\Inventory\SaveReceiptData;
use App\Models\InventoryLocation;
use App\Models\OperatingUnit;
use App\Models\Receipt;
use App\Models\Supplier;
use App\Services\Inventory\ReceiptService;
use Illuminate\Auth\Access\AuthorizationException;
use PHPUnit\Framework\Attributes\Test;
use Spatie\Permission\Models\Role;

/**
 * The by-ID Purchase Receipt routes (show/update/delete/post/reverse) must apply
 * the same horizontal Operating Unit authorization as the list path (#586) — a
 * scoped caller who learns a Receipt's public ULID from another unit must not be
 * able to read or mutate it.
 */
class ReceiptScopedAccessTest extends InventoryTestCase
{
    private Supplier $supplier;

    private InventoryLocation $foreignLocation;

    private Receipt $foreignReceipt;

    private Receipt $accessibleReceipt;

    protected function setUp(): void
    {
        parent::setUp();

        $this->supplier = $this->createSupplier(['code' => 'SUP-SCOPE', 'name' => 'Scope Supplier']);

        $foreignUnit = OperatingUnit::create([
            'branch_id' => $this->branch->id,
            'type' => 'BRANCH_MAIN',
            'name' => 'Foreign Inventory',
            'is_active' => true,
        ]);

        $this->foreignLocation = InventoryLocation::create([
            'operating_unit_id' => $foreignUnit->id,
            'name' => 'Foreign Warehouse',
            'type' => 'MAIN',
            'priority' => 80,
            'is_active' => true,
        ]);

        $this->foreignReceipt = $this->makeReceipt($this->foreignLocation->id);
        $this->accessibleReceipt = $this->makeReceipt($this->location->id);
    }

    private function makeReceipt(int $locationId, string $status = Receipt::STATUS_DRAFT): Receipt
    {
        return Receipt::create([
            'supplier_id' => $this->supplier->id,
            'destination_location_id' => $locationId,
            'reference' => 'FAC-'.uniqid(),
            'receipt_date' => '2026-08-25',
            'status' => $status,
            'posted_at' => $status === Receipt::STATUS_DRAFT ? null : now(),
            'posted_by_user_id' => $status === Receipt::STATUS_DRAFT ? null : $this->user->id,
            'created_by_user_id' => $this->user->id,
        ]);
    }

    /** Revoke the caller's membership in their unit — stands in for a scope change
     *  (revoked membership, or a bypass-role transfer) between the controller
     *  guard and the service's row lock. */
    private function loseAccessToOwnUnit(): void
    {
        $this->user->operatingUnits()->detach($this->operatingUnit->id);
    }

    private function receiptPayload(?InventoryLocation $destination = null): array
    {
        $item = $this->createItem();
        $variant = $this->createItemVariant($item);
        $template = $this->createPurchasePresentationTemplate();
        $presentation = $this->createVariantPurchasePresentation($variant, $template);

        return [
            'supplier_id' => $this->supplier->public_id,
            'destination_location_id' => ($destination ?? $this->location)->public_id,
            'receipt_date' => '2026-08-26',
            'lines' => [[
                'variant_purchase_presentation_id' => $presentation->public_id,
                'received_packages' => 5,
                'gross_amount' => 100,
            ]],
        ];
    }

    #[Test]
    public function it_forbids_showing_a_receipt_outside_the_callers_operating_units(): void
    {
        $this->getJson("/api/v1/inventory/receipts/{$this->foreignReceipt->public_id}")
            ->assertForbidden();
    }

    #[Test]
    public function it_forbids_updating_a_receipt_outside_the_callers_operating_units(): void
    {
        // Accessible destination in the payload, so the 403 comes from the target
        // Receipt living in a foreign unit — not from destination validation.
        $this->putJson("/api/v1/inventory/receipts/{$this->foreignReceipt->public_id}", $this->receiptPayload())
            ->assertForbidden();
    }

    #[Test]
    public function it_rejects_transferring_an_accessible_receipt_to_a_foreign_destination(): void
    {
        $this->putJson(
            "/api/v1/inventory/receipts/{$this->accessibleReceipt->public_id}",
            $this->receiptPayload($this->foreignLocation)
        )
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['destination_location_id']);
    }

    #[Test]
    public function it_rejects_creating_a_receipt_into_a_foreign_destination(): void
    {
        $this->postJson('/api/v1/inventory/receipts', $this->receiptPayload($this->foreignLocation))
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['destination_location_id']);
    }

    #[Test]
    public function it_allows_creating_a_receipt_into_an_accessible_destination(): void
    {
        $this->postJson('/api/v1/inventory/receipts', $this->receiptPayload())
            ->assertCreated();
    }

    #[Test]
    public function it_forbids_deleting_a_receipt_outside_the_callers_operating_units(): void
    {
        $this->deleteJson("/api/v1/inventory/receipts/{$this->foreignReceipt->public_id}")
            ->assertForbidden();

        $this->assertDatabaseHas('receipts', ['id' => $this->foreignReceipt->id, 'deleted_at' => null]);
    }

    #[Test]
    public function it_forbids_posting_a_receipt_outside_the_callers_operating_units(): void
    {
        $this->postJson("/api/v1/inventory/receipts/{$this->foreignReceipt->public_id}/post")
            ->assertForbidden();

        $this->assertDatabaseHas('receipts', ['id' => $this->foreignReceipt->id, 'status' => Receipt::STATUS_DRAFT]);
    }

    #[Test]
    public function it_forbids_reversing_a_receipt_outside_the_callers_operating_units(): void
    {
        $this->postJson("/api/v1/inventory/receipts/{$this->foreignReceipt->public_id}/reverse", ['reason' => 'x'])
            ->assertForbidden();
    }

    #[Test]
    public function post_rechecks_scope_under_the_lock_so_a_raced_transfer_cannot_add_stock_to_a_foreign_unit(): void
    {
        $receipt = $this->makeReceipt($this->location->id);
        $this->loseAccessToOwnUnit();

        $this->expectException(AuthorizationException::class);

        app(ReceiptService::class)->postReceipt($receipt->id, $this->user->id);
    }

    #[Test]
    public function update_rechecks_scope_under_the_lock(): void
    {
        $receipt = $this->makeReceipt($this->location->id);
        $this->loseAccessToOwnUnit();

        $data = new SaveReceiptData(
            supplierId: $this->supplier->id,
            destinationLocationId: $this->location->id,
            reference: 'X',
            receiptDate: '2026-08-26',
            notes: null,
            actingUserId: $this->user->id,
            lines: [],
        );

        $this->expectException(AuthorizationException::class);

        app(ReceiptService::class)->updateDraft($receipt->id, $data);
    }

    #[Test]
    public function create_asserts_the_destination_is_accessible_in_the_service_not_only_in_the_request(): void
    {
        $data = new SaveReceiptData(
            supplierId: $this->supplier->id,
            destinationLocationId: $this->foreignLocation->id,
            reference: 'X',
            receiptDate: '2026-08-26',
            notes: null,
            actingUserId: $this->user->id,
            lines: [],
        );

        $this->expectException(AuthorizationException::class);

        app(ReceiptService::class)->createDraft($data);
    }

    #[Test]
    public function update_asserts_the_new_destination_is_accessible_in_the_service(): void
    {
        $receipt = $this->makeReceipt($this->location->id);

        $data = new SaveReceiptData(
            supplierId: $this->supplier->id,
            destinationLocationId: $this->foreignLocation->id,
            reference: 'X',
            receiptDate: '2026-08-26',
            notes: null,
            actingUserId: $this->user->id,
            lines: [],
        );

        $this->expectException(AuthorizationException::class);

        app(ReceiptService::class)->updateDraft($receipt->id, $data);
    }

    #[Test]
    public function delete_rechecks_scope_under_the_lock(): void
    {
        $receipt = $this->makeReceipt($this->location->id);
        $this->loseAccessToOwnUnit();

        $this->expectException(AuthorizationException::class);

        app(ReceiptService::class)->deleteDraft($receipt->id, $this->user->id);
    }

    #[Test]
    public function reverse_rechecks_scope_under_the_lock(): void
    {
        $receipt = $this->makeReceipt($this->location->id, Receipt::STATUS_POSTED);
        $this->loseAccessToOwnUnit();

        $this->expectException(AuthorizationException::class);

        app(ReceiptService::class)->reverseReceipt($receipt->id, $this->user->id, null);
    }

    #[Test]
    public function it_still_shows_a_receipt_inside_an_accessible_operating_unit(): void
    {
        $this->getJson("/api/v1/inventory/receipts/{$this->accessibleReceipt->public_id}")
            ->assertOk()
            ->assertJsonPath('data.id', $this->accessibleReceipt->public_id);
    }

    #[Test]
    public function it_lets_a_bypass_role_access_a_receipt_in_any_operating_unit(): void
    {
        Role::firstOrCreate(['name' => 'admin', 'guard_name' => 'api']);
        $this->user->assignRole('admin');

        $this->getJson("/api/v1/inventory/receipts/{$this->foreignReceipt->public_id}")
            ->assertOk()
            ->assertJsonPath('data.id', $this->foreignReceipt->public_id);
    }
}
