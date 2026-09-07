<?php

namespace Tests\Feature\Inventory;

use App\Models\InventoryLocation;
use App\Models\Stock;
use App\Models\StockMovement;
use App\Models\User;
use App\Models\VariantLocationAssignment;
use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Support\Facades\DB;
use Laravel\Passport\Passport;
use PHPUnit\Framework\Attributes\Test;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;

class VariantLocationAssignmentCrudTest extends InventoryTestCase
{
    private function secondLocation(): InventoryLocation
    {
        return InventoryLocation::create([
            'operating_unit_id' => $this->operatingUnit->id,
            'name' => 'Bar Fridge',
            'type' => InventoryLocation::TYPE_BAR,
            'priority' => 40,
            'is_active' => true,
        ]);
    }

    private function url(string $locationPublicId, ?string $variantPublicId = null): string
    {
        $base = "/api/v1/inventory-locations/{$locationPublicId}/variant-assignments";

        return $variantPublicId ? "{$base}/{$variantPublicId}" : $base;
    }

    #[Test]
    public function it_assigns_a_variant_with_201(): void
    {
        $variant = $this->createItemVariant($this->createItem());

        $response = $this->putJson($this->url($this->location->public_id, $variant->public_id));

        $response->assertStatus(201)
            ->assertJsonPath('data.assigned', true)
            ->assertJsonPath('data.inventory_location_id', $this->location->public_id)
            ->assertJsonPath('data.item_variant_id', $variant->public_id)
            ->assertJsonPath('data.item_variant_code', $variant->code)
            ->assertJsonPath('data.assignment_id', fn ($v) => is_string($v) && strlen($v) === 26)
            ->assertJsonPath('data.assigned_at', fn ($v) => is_string($v) && str_contains($v, 'T'));

        $this->assertDatabaseHas('variant_location_assignments', [
            'inventory_location_id' => $this->location->id,
            'item_variant_id' => $variant->id,
            'deleted_at' => null,
        ]);
    }

    #[Test]
    public function it_returns_200_when_the_variant_is_already_assigned(): void
    {
        $variant = $this->createItemVariant($this->createItem());

        $this->putJson($this->url($this->location->public_id, $variant->public_id))->assertStatus(201);
        $this->putJson($this->url($this->location->public_id, $variant->public_id))
            ->assertStatus(200)
            ->assertJsonPath('data.assigned', true);

        $this->assertSame(1, VariantLocationAssignment::where('item_variant_id', $variant->id)->count());
    }

    #[Test]
    public function assigning_a_variant_never_creates_a_stock_row_or_movement(): void
    {
        $variant = $this->createItemVariant($this->createItem());

        $this->putJson($this->url($this->location->public_id, $variant->public_id))->assertStatus(201);

        $this->assertDatabaseMissing('stock', [
            'inventory_location_id' => $this->location->id,
            'item_variant_id' => $variant->id,
        ]);
        $this->assertSame(0, StockMovement::query()->where('item_variant_id', $variant->id)->count());
    }

    #[Test]
    public function it_enforces_one_live_assignment_per_location_variant_pair(): void
    {
        $variant = $this->createItemVariant($this->createItem());

        $first = VariantLocationAssignment::create([
            'inventory_location_id' => $this->location->id,
            'item_variant_id' => $variant->id,
        ]);

        // A second live row for the same pair is rejected by the partial
        // unique index. Wrapped in a nested transaction so the expected error
        // rolls back to a savepoint instead of poisoning the test transaction.
        try {
            DB::transaction(function () use ($variant) {
                VariantLocationAssignment::create([
                    'inventory_location_id' => $this->location->id,
                    'item_variant_id' => $variant->id,
                ]);
            });
            $this->fail('expected a unique-constraint violation for a second live assignment');
        } catch (UniqueConstraintViolationException) {
            // expected
        }

        // But a soft-deleted former assignment must not block a fresh live one.
        $first->delete();
        VariantLocationAssignment::create([
            'inventory_location_id' => $this->location->id,
            'item_variant_id' => $variant->id,
        ]);

        $this->assertSame(1, VariantLocationAssignment::where('inventory_location_id', $this->location->id)
            ->where('item_variant_id', $variant->id)
            ->count());
        $this->assertSame(2, VariantLocationAssignment::withTrashed()
            ->where('inventory_location_id', $this->location->id)
            ->where('item_variant_id', $variant->id)
            ->count());
    }

    #[Test]
    public function unassign_then_assign_reactivates_the_same_row_and_keeps_history(): void
    {
        $variant = $this->createItemVariant($this->createItem());

        $this->putJson($this->url($this->location->public_id, $variant->public_id))->assertStatus(201);
        $originalId = VariantLocationAssignment::where('item_variant_id', $variant->id)->value('id');

        $this->deleteJson($this->url($this->location->public_id, $variant->public_id))->assertNoContent();
        $this->assertSoftDeleted('variant_location_assignments', ['id' => $originalId]);

        $this->putJson($this->url($this->location->public_id, $variant->public_id))->assertStatus(201);

        $live = VariantLocationAssignment::where('item_variant_id', $variant->id)->get();
        $this->assertCount(1, $live);
        $this->assertSame($originalId, $live->first()->id, 'the soft-deleted row is reactivated, not replaced');
        $this->assertSame(1, VariantLocationAssignment::withTrashed()->where('item_variant_id', $variant->id)->count());
    }

    #[Test]
    public function it_lists_assigned_variants_for_a_location(): void
    {
        $assigned = $this->createItemVariant($this->createItem(), ['code' => 'AAA-1']);
        $notAssigned = $this->createItemVariant($this->createItem(), ['code' => 'BBB-1']);
        $atOtherLocation = $this->createItemVariant($this->createItem(), ['code' => 'CCC-1']);
        $bar = $this->secondLocation();

        VariantLocationAssignment::create(['inventory_location_id' => $this->location->id, 'item_variant_id' => $assigned->id]);
        VariantLocationAssignment::create(['inventory_location_id' => $bar->id, 'item_variant_id' => $atOtherLocation->id]);

        $response = $this->getJson($this->url($this->location->public_id));

        $response->assertOk();
        $codes = collect($response->json('data'))->pluck('item_variant_code')->all();
        $this->assertContains('AAA-1', $codes);
        $this->assertNotContains('BBB-1', $codes);
        $this->assertNotContains('CCC-1', $codes);
        $this->assertTrue(collect($response->json('data'))->every(fn ($row) => $row['assigned'] === true));
        $this->assertTrue(collect($response->json('data'))->every(
            fn ($row) => is_string($row['assignment_id']) && is_string($row['assigned_at'])
        ));
    }

    #[Test]
    public function a_variant_deactivated_after_assignment_stays_visible_and_unassignable(): void
    {
        $variant = $this->createItemVariant($this->createItem(), ['code' => 'AAA-1']);
        VariantLocationAssignment::create(['inventory_location_id' => $this->location->id, 'item_variant_id' => $variant->id]);

        // Deactivated *after* being assigned — the write path only blocks
        // assigning a fresh inactive Variant, it never revokes an existing one.
        $variant->update(['is_active' => false]);

        $assignedList = $this->getJson($this->url($this->location->public_id));
        $assignedList->assertOk();
        $this->assertContains('AAA-1', collect($assignedList->json('data'))->pluck('item_variant_code')->all());

        $allList = $this->getJson($this->url($this->location->public_id).'?state=all');
        $allList->assertOk();
        $this->assertTrue(collect($allList->json('data'))->keyBy('item_variant_code')['AAA-1']['assigned']);

        // Still discoverable, so it is still unassignable.
        $this->deleteJson($this->url($this->location->public_id, $variant->public_id))->assertNoContent();
    }

    #[Test]
    public function it_lists_unassigned_variants_for_a_location(): void
    {
        $assigned = $this->createItemVariant($this->createItem(), ['code' => 'AAA-1']);
        $free = $this->createItemVariant($this->createItem(), ['code' => 'BBB-1']);
        $inactive = $this->createItemVariant($this->createItem(), ['code' => 'ZZZ-1', 'is_active' => false]);

        VariantLocationAssignment::create(['inventory_location_id' => $this->location->id, 'item_variant_id' => $assigned->id]);

        $response = $this->getJson($this->url($this->location->public_id).'?state=unassigned');

        $response->assertOk();
        $codes = collect($response->json('data'))->pluck('item_variant_code')->all();
        $this->assertContains('BBB-1', $codes);
        $this->assertNotContains('AAA-1', $codes);
        $this->assertNotContains('ZZZ-1', $codes, 'inactive variants are outside the catalog rules');
        $this->assertTrue(collect($response->json('data'))->every(fn ($row) => $row['assigned'] === false));
    }

    #[Test]
    public function it_lists_all_active_variants_annotated_with_their_state(): void
    {
        $assigned = $this->createItemVariant($this->createItem(), ['code' => 'AAA-1']);
        $free = $this->createItemVariant($this->createItem(), ['code' => 'BBB-1']);

        VariantLocationAssignment::create(['inventory_location_id' => $this->location->id, 'item_variant_id' => $assigned->id]);

        $response = $this->getJson($this->url($this->location->public_id).'?state=all');

        $response->assertOk();
        $rows = collect($response->json('data'))->keyBy('item_variant_code');
        $this->assertTrue($rows['AAA-1']['assigned']);
        $this->assertFalse($rows['BBB-1']['assigned']);
    }

    #[Test]
    public function the_list_supports_search_and_pagination(): void
    {
        $needle = $this->createItemVariant($this->createItem(), ['code' => 'FIND-ME-1', 'name' => 'Special']);
        VariantLocationAssignment::create(['inventory_location_id' => $this->location->id, 'item_variant_id' => $needle->id]);

        foreach (range(1, 3) as $i) {
            $v = $this->createItemVariant($this->createItem(), ['code' => "OTHER-{$i}"]);
            VariantLocationAssignment::create(['inventory_location_id' => $this->location->id, 'item_variant_id' => $v->id]);
        }

        $this->getJson($this->url($this->location->public_id).'?search=find-me')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.item_variant_code', 'FIND-ME-1');

        $paged = $this->getJson($this->url($this->location->public_id).'?per_page=2');
        $paged->assertOk()->assertJsonCount(2, 'data')->assertJsonPath('meta.total', 4);
    }

    #[Test]
    public function it_unassigns_a_variant_with_204(): void
    {
        $variant = $this->createItemVariant($this->createItem());
        $assignment = VariantLocationAssignment::create([
            'inventory_location_id' => $this->location->id, 'item_variant_id' => $variant->id,
        ]);

        $this->deleteJson($this->url($this->location->public_id, $variant->public_id))->assertNoContent();

        $this->assertSoftDeleted('variant_location_assignments', ['id' => $assignment->id]);
    }

    #[Test]
    public function it_locks_the_assignment_before_checking_stock_during_unassignment(): void
    {
        $variant = $this->createItemVariant($this->createItem());
        VariantLocationAssignment::create([
            'inventory_location_id' => $this->location->id,
            'item_variant_id' => $variant->id,
        ]);

        $queries = [];
        DB::listen(function ($query) use (&$queries): void {
            $queries[] = strtolower($query->sql);
        });

        $this->deleteJson($this->url($this->location->public_id, $variant->public_id))->assertNoContent();

        $assignmentLock = array_find_key($queries, fn ($sql) => str_contains($sql, 'variant_location_assignments') && str_contains($sql, 'for update'));
        $stockLock = array_find_key($queries, fn ($sql) => str_contains($sql, 'from "stock"') && str_contains($sql, 'for update'));

        $this->assertNotNull($assignmentLock, 'Expected unassignment to lock the managed pair.');
        $this->assertNotNull($stockLock, 'Expected unassignment to lock/check Stock.');
        $this->assertLessThan($stockLock, $assignmentLock, 'Both inbound posting and unassignment must use assignment-then-Stock lock order.');
    }

    #[Test]
    public function it_blocks_unassignment_while_on_hand_stock_remains_with_409(): void
    {
        $variant = $this->createItemVariant($this->createItem());
        VariantLocationAssignment::create(['inventory_location_id' => $this->location->id, 'item_variant_id' => $variant->id]);
        Stock::create([
            'inventory_location_id' => $this->location->id,
            'item_variant_id' => $variant->id,
            'on_hand' => 3,
            'reserved' => 0,
        ]);

        $this->deleteJson($this->url($this->location->public_id, $variant->public_id))
            ->assertStatus(409)
            ->assertJsonPath('status', 409);

        $this->assertDatabaseHas('variant_location_assignments', [
            'inventory_location_id' => $this->location->id,
            'item_variant_id' => $variant->id,
            'deleted_at' => null,
        ]);
    }

    #[Test]
    public function it_blocks_unassignment_while_reserved_stock_remains_with_409(): void
    {
        $variant = $this->createItemVariant($this->createItem());
        VariantLocationAssignment::create(['inventory_location_id' => $this->location->id, 'item_variant_id' => $variant->id]);
        Stock::create([
            'inventory_location_id' => $this->location->id,
            'item_variant_id' => $variant->id,
            'on_hand' => 5,
            'reserved' => 2,
        ]);

        $this->deleteJson($this->url($this->location->public_id, $variant->public_id))->assertStatus(409);
    }

    #[Test]
    public function it_allows_unassignment_when_the_stock_row_is_zeroed(): void
    {
        $variant = $this->createItemVariant($this->createItem());
        VariantLocationAssignment::create(['inventory_location_id' => $this->location->id, 'item_variant_id' => $variant->id]);
        $stock = Stock::create([
            'inventory_location_id' => $this->location->id,
            'item_variant_id' => $variant->id,
            'on_hand' => 0,
            'reserved' => 0,
        ]);

        $this->deleteJson($this->url($this->location->public_id, $variant->public_id))->assertNoContent();

        // The guard locks the zeroed Stock row but never mutates or removes it.
        $this->assertDatabaseHas('stock', ['id' => $stock->id, 'on_hand' => 0, 'reserved' => 0]);
    }

    #[Test]
    public function assignments_and_replenishment_policies_stay_independent(): void
    {
        $variant = $this->createItemVariant($this->createItem());

        // Configuring a replenishment policy does not assign the variant.
        $this->putJson(
            "/api/v1/inventory-locations/{$this->location->public_id}/replenishment-policies/{$variant->public_id}",
            ['min_stock' => 10, 'max_stock' => 100]
        )->assertStatus(201);
        $this->assertDatabaseMissing('variant_location_assignments', [
            'inventory_location_id' => $this->location->id, 'item_variant_id' => $variant->id, 'deleted_at' => null,
        ]);

        // Assigning does not touch the policy.
        $this->putJson($this->url($this->location->public_id, $variant->public_id))->assertStatus(201);
        $this->assertDatabaseHas('variant_location_replenishment_policies', [
            'inventory_location_id' => $this->location->id, 'item_variant_id' => $variant->id, 'min_stock' => 10,
        ]);

        // Unassigning does not remove the policy.
        $this->deleteJson($this->url($this->location->public_id, $variant->public_id))->assertNoContent();
        $this->assertDatabaseHas('variant_location_replenishment_policies', [
            'inventory_location_id' => $this->location->id, 'item_variant_id' => $variant->id, 'deleted_at' => null,
        ]);
    }

    #[Test]
    public function it_rejects_assigning_an_inactive_variant_with_422(): void
    {
        $variant = $this->createItemVariant($this->createItem(), ['is_active' => false]);

        $this->putJson($this->url($this->location->public_id, $variant->public_id))
            ->assertStatus(422)
            ->assertJsonValidationErrors(['variantId']);

        $this->assertDatabaseMissing('variant_location_assignments', [
            'inventory_location_id' => $this->location->id,
            'item_variant_id' => $variant->id,
        ]);
    }

    #[Test]
    public function it_requires_authentication(): void
    {
        $variant = $this->createItemVariant($this->createItem());
        app('auth')->forgetGuards();

        $this->putJson($this->url($this->location->public_id, $variant->public_id))->assertStatus(401);
        $this->getJson($this->url($this->location->public_id))->assertStatus(401);
    }

    #[Test]
    public function it_forbids_writing_without_stock_manage_permission(): void
    {
        $variant = $this->createItemVariant($this->createItem());

        Permission::firstOrCreate(['name' => 'stock.view', 'guard_name' => 'api']);
        $readOnly = Role::firstOrCreate(['name' => 'stock-reader', 'guard_name' => 'api']);
        $readOnly->syncPermissions(['stock.view']);
        $viewer = User::factory()->create(['email' => 'viewer@sushigo.com']);
        $viewer->assignRole('stock-reader');
        $viewer->operatingUnits()->attach($this->operatingUnit->id, [
            'assignment_role' => 'AUDITOR',
            'is_active' => true,
        ]);
        Passport::actingAs($viewer);

        $this->getJson($this->url($this->location->public_id))->assertOk();
        $this->putJson($this->url($this->location->public_id, $variant->public_id))->assertStatus(403);
        $this->deleteJson($this->url($this->location->public_id, $variant->public_id))->assertStatus(403);
    }

    #[Test]
    public function it_forbids_access_from_outside_the_locations_operating_unit(): void
    {
        $variant = $this->createItemVariant($this->createItem());

        $outsider = User::factory()->create(['email' => 'outsider@sushigo.com']);
        $outsider->assignRole('inventory-manager');
        Passport::actingAs($outsider);

        $this->getJson($this->url($this->location->public_id))->assertStatus(403);
        $this->putJson($this->url($this->location->public_id, $variant->public_id))->assertStatus(403);
    }

    #[Test]
    public function it_404s_for_an_unknown_location_or_variant(): void
    {
        $variant = $this->createItemVariant($this->createItem());

        $this->getJson($this->url('01JUNKNOWNLOCATION00000000'))->assertStatus(404);
        $this->putJson($this->url($this->location->public_id, '01JUNKNOWNVARIANT00000000'))->assertStatus(404);
        $this->deleteJson($this->url($this->location->public_id, '01JUNKNOWNVARIANT00000000'))->assertStatus(404);
        $this->deleteJson($this->url($this->location->public_id, $variant->public_id))->assertStatus(404);
    }
}
