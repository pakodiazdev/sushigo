<?php

namespace Tests\Feature\Inventory;

use App\Models\InventoryLocation;
use App\Models\ItemVariant;
use App\Models\OperatingUnit;
use App\Models\Receipt;
use App\Models\StockMovement;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Laravel\Passport\Passport;
use PHPUnit\Framework\Attributes\Test;
use Spatie\Permission\Models\Role;

/**
 * GET /api/v1/inventory/movements (list) and /{movement} (detail) — the
 * read-only Inventory Stock Movement ledger (#574). Exposes the existing
 * immutable ledger evidence without any Stock or movement write side effect.
 */
class StockMovementLedgerTest extends InventoryTestCase
{
    private ItemVariant $variant;

    private int $seq = 0;

    protected function setUp(): void
    {
        parent::setUp();

        $this->variant = $this->createItemVariant($this->createItem());
    }

    private function makeMovement(array $overrides = []): StockMovement
    {
        $this->seq++;

        return StockMovement::create(array_merge([
            'from_location_id' => null,
            'to_location_id' => $this->location->id,
            'item_variant_id' => $this->variant->id,
            'user_id' => $this->user->id,
            'qty' => 5,
            'reason' => StockMovement::REASON_PURCHASE_RECEIPT,
            'status' => StockMovement::STATUS_POSTED,
            'reference' => 'MV-'.str_pad((string) $this->seq, 4, '0', STR_PAD_LEFT),
            'posted_at' => now()->subMinutes(100 - $this->seq),
        ], $overrides));
    }

    private function secondaryLocation(): InventoryLocation
    {
        $unit = OperatingUnit::create([
            'branch_id' => $this->branch->id,
            'type' => 'BRANCH_MAIN',
            'name' => 'Second Inventory '.uniqid(),
            'is_active' => true,
        ]);

        return InventoryLocation::create([
            'operating_unit_id' => $unit->id,
            'name' => 'Second Warehouse',
            'type' => 'MAIN',
            'priority' => 90,
            'is_active' => true,
        ]);
    }

    private function bypassRole(): string
    {
        Role::firstOrCreate(['name' => 'admin', 'guard_name' => 'api']);

        return 'admin';
    }

    // ----- authentication & authorization -------------------------------------

    #[Test]
    public function it_requires_authentication(): void
    {
        auth()->forgetGuards();

        $this->getJson('/api/v1/inventory/movements')->assertUnauthorized();
    }

    #[Test]
    public function it_forbids_a_user_without_stock_view(): void
    {
        $movement = $this->makeMovement();

        $stranger = User::factory()->create();
        Passport::actingAs($stranger);

        $this->getJson('/api/v1/inventory/movements')->assertForbidden();
        $this->getJson("/api/v1/inventory/movements/{$movement->public_id}")->assertForbidden();
    }

    // ----- pagination & ordering --------------------------------------------

    #[Test]
    public function it_bounds_the_default_page_size(): void
    {
        for ($i = 0; $i < 20; $i++) {
            $this->makeMovement();
        }

        $this->getJson('/api/v1/inventory/movements')
            ->assertOk()
            ->assertJsonCount(15, 'data')
            ->assertJsonPath('meta.per_page', 15)
            ->assertJsonPath('meta.total', 20)
            ->assertJsonPath('meta.last_page', 2);
    }

    #[Test]
    public function it_rejects_per_page_above_the_documented_maximum(): void
    {
        $this->makeMovement();

        $this->getJson('/api/v1/inventory/movements?per_page=101')
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['per_page']);

        $this->getJson('/api/v1/inventory/movements?per_page=100')->assertOk();
    }

    #[Test]
    public function it_paginates_without_duplicating_or_dropping_rows(): void
    {
        $expected = [];
        for ($i = 0; $i < 25; $i++) {
            $expected[] = $this->makeMovement()->public_id;
        }

        $seen = [];
        foreach ([1, 2, 3] as $page) {
            $seen = array_merge($seen, $this->getJson("/api/v1/inventory/movements?per_page=10&page={$page}")
                ->assertOk()
                ->json('data.*.id'));
        }

        $this->assertCount(25, $seen);
        $this->assertCount(25, array_unique($seen));
        sort($expected);
        sort($seen);
        $this->assertSame($expected, $seen);
    }

    #[Test]
    public function it_orders_newest_first_with_a_stable_id_tiebreaker(): void
    {
        $sharedInstant = now()->subDay();
        $a = $this->makeMovement(['posted_at' => $sharedInstant]);
        $b = $this->makeMovement(['posted_at' => $sharedInstant]);
        $newer = $this->makeMovement(['posted_at' => now()]);

        $this->getJson('/api/v1/inventory/movements')
            ->assertOk()
            ->assertJsonPath('data.0.id', $newer->public_id)
            ->assertJsonPath('data.1.id', $b->public_id)
            ->assertJsonPath('data.2.id', $a->public_id);
    }

    #[Test]
    public function it_sorts_unposted_drafts_after_posted_rows(): void
    {
        $posted = $this->makeMovement(['posted_at' => now()->subYear()]);
        $draft = $this->makeMovement(['status' => StockMovement::STATUS_DRAFT, 'posted_at' => null]);

        $ids = $this->getJson('/api/v1/inventory/movements')->assertOk()->json('data.*.id');

        $this->assertSame([$posted->public_id, $draft->public_id], $ids);
    }

    // ----- filters ---------------------------------------------------------

    #[Test]
    public function it_filters_by_location_matching_either_endpoint(): void
    {
        $other = $this->secondaryLocation();
        $this->user->assignRole($this->bypassRole());

        $inbound = $this->makeMovement(['to_location_id' => $this->location->id, 'from_location_id' => null]);
        $outbound = $this->makeMovement([
            'from_location_id' => $this->location->id, 'to_location_id' => null,
            'reason' => StockMovement::REASON_CONSUMPTION,
        ]);
        $transfer = $this->makeMovement([
            'from_location_id' => $other->id, 'to_location_id' => $this->location->id,
            'reason' => StockMovement::REASON_TRANSFER,
        ]);
        $this->makeMovement(['to_location_id' => $other->id, 'from_location_id' => null]);

        $ids = $this->getJson('/api/v1/inventory/movements?location_id='.$this->location->public_id)
            ->assertOk()
            ->assertJsonPath('meta.total', 3)
            ->json('data.*.id');

        sort($ids);
        $expected = [$inbound->public_id, $outbound->public_id, $transfer->public_id];
        sort($expected);
        $this->assertSame($expected, $ids);
    }

    #[Test]
    public function it_filters_by_item_variant(): void
    {
        $otherVariant = $this->createItemVariant($this->createItem());

        $this->makeMovement(['item_variant_id' => $this->variant->id]);
        $this->makeMovement(['item_variant_id' => $this->variant->id]);
        $this->makeMovement(['item_variant_id' => $otherVariant->id]);

        $this->getJson('/api/v1/inventory/movements?item_variant_id='.$this->variant->public_id)
            ->assertOk()
            ->assertJsonPath('meta.total', 2);
    }

    #[Test]
    public function it_filters_by_reason(): void
    {
        $this->makeMovement(['reason' => StockMovement::REASON_PURCHASE_RECEIPT]);
        $this->makeMovement(['reason' => StockMovement::REASON_OPENING_BALANCE]);
        $this->makeMovement(['reason' => StockMovement::REASON_OPENING_BALANCE]);

        $this->getJson('/api/v1/inventory/movements?reason=OPENING_BALANCE')
            ->assertOk()
            ->assertJsonPath('meta.total', 2);

        $this->getJson('/api/v1/inventory/movements?reason=NOT_A_REASON')
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['reason']);
    }

    #[Test]
    public function it_filters_by_status(): void
    {
        $this->makeMovement(['status' => StockMovement::STATUS_POSTED]);
        $this->makeMovement(['status' => StockMovement::STATUS_DRAFT, 'posted_at' => null]);

        $this->getJson('/api/v1/inventory/movements?status=DRAFT')
            ->assertOk()
            ->assertJsonPath('meta.total', 1);

        $this->getJson('/api/v1/inventory/movements?status=NOPE')
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['status']);
    }

    #[Test]
    public function it_filters_by_posted_date_range(): void
    {
        $this->makeMovement(['posted_at' => '2026-08-05 10:00:00']);
        $this->makeMovement(['posted_at' => '2026-08-10 10:00:00']);
        $this->makeMovement(['posted_at' => '2026-08-12 10:00:00']);
        $this->makeMovement(['posted_at' => '2026-08-20 10:00:00']);

        $this->getJson('/api/v1/inventory/movements?date_from=2026-08-10&date_to=2026-08-12')
            ->assertOk()
            ->assertJsonPath('meta.total', 2);

        $this->getJson('/api/v1/inventory/movements?date_from=2026-08-20&date_to=2026-08-10')
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['date_to']);
    }

    #[Test]
    public function it_filters_by_reference_search_treating_wildcards_literally(): void
    {
        $this->makeMovement(['reference' => 'DOC-2026-777']);
        $this->makeMovement(['reference' => 'AB%CD']);
        $this->makeMovement(['reference' => 'ABZCD']);

        $this->getJson('/api/v1/inventory/movements?search=2026-777')
            ->assertOk()
            ->assertJsonPath('meta.total', 1)
            ->assertJsonPath('data.0.reference', 'DOC-2026-777');

        $this->getJson('/api/v1/inventory/movements?search='.urlencode('B%C'))
            ->assertOk()
            ->assertJsonPath('meta.total', 1)
            ->assertJsonPath('data.0.reference', 'AB%CD');
    }

    #[Test]
    public function it_filters_by_source_type(): void
    {
        $this->makeMovement(['related_type' => Receipt::class, 'related_id' => 1]);
        $this->makeMovement(['related_type' => Receipt::class, 'related_id' => 2]);
        $this->makeMovement(['related_type' => null, 'related_id' => null]);

        $this->getJson('/api/v1/inventory/movements?source_type=receipt')
            ->assertOk()
            ->assertJsonPath('meta.total', 2);

        $this->getJson('/api/v1/inventory/movements?source_type=unicorn')
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['source_type']);
    }

    #[Test]
    public function it_rejects_an_inaccessible_location_filter_like_a_nonexistent_one(): void
    {
        $inaccessible = $this->secondaryLocation();

        $this->getJson('/api/v1/inventory/movements?location_id='.$inaccessible->public_id)
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['location_id']);

        $this->getJson('/api/v1/inventory/movements?location_id=01JAAAAAAAAAAAAAAAAAAAAAAA')
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['location_id']);
    }

    // ----- operating-unit isolation --------------------------------------

    #[Test]
    public function it_scopes_movements_to_the_users_operating_units_before_counting(): void
    {
        $foreign = $this->secondaryLocation();

        for ($i = 0; $i < 5; $i++) {
            $this->makeMovement();
        }
        for ($i = 0; $i < 7; $i++) {
            $this->makeMovement(['to_location_id' => $foreign->id]);
        }

        $response = $this->getJson('/api/v1/inventory/movements?per_page=100')
            ->assertOk()
            ->assertJsonPath('meta.total', 5)
            ->assertJsonCount(5, 'data');

        foreach ($response->json('data') as $row) {
            $this->assertSame($this->location->public_id, $row['to_location']['id']);
        }
    }

    #[Test]
    public function it_never_leaks_a_movement_whose_only_touched_location_is_foreign(): void
    {
        $foreign = $this->secondaryLocation();
        $foreignOut = $this->makeMovement([
            'from_location_id' => $foreign->id, 'to_location_id' => null,
            'reason' => StockMovement::REASON_CONSUMPTION,
        ]);

        $this->getJson('/api/v1/inventory/movements')->assertOk()->assertJsonPath('meta.total', 0);

        $this->getJson("/api/v1/inventory/movements/{$foreignOut->public_id}")->assertForbidden();
    }

    #[Test]
    public function it_lets_a_bypass_role_open_a_movement_detail_in_any_unit(): void
    {
        $foreign = $this->secondaryLocation();
        $foreignMovement = $this->makeMovement(['to_location_id' => $foreign->id]);

        $this->user->assignRole($this->bypassRole());

        $this->getJson("/api/v1/inventory/movements/{$foreignMovement->public_id}")
            ->assertOk()
            ->assertJsonPath('data.id', $foreignMovement->public_id);
    }

    #[Test]
    public function it_shows_a_transfer_that_touches_one_accessible_location_but_masks_the_foreign_end(): void
    {
        $foreign = $this->secondaryLocation();
        $transfer = $this->makeMovement([
            'from_location_id' => $foreign->id,
            'to_location_id' => $this->location->id,
            'reason' => StockMovement::REASON_TRANSFER,
        ]);

        // Visible (its `to` end is in scope) — but the foreign `from` Location
        // must not leak its name or public ID to a scoped caller (#574).
        $this->getJson("/api/v1/inventory/movements/{$transfer->public_id}")
            ->assertOk()
            ->assertJsonPath('data.id', $transfer->public_id)
            ->assertJsonPath('data.from_location', null)
            ->assertJsonPath('data.to_location.id', $this->location->public_id);

        // The list path masks it too.
        $this->getJson('/api/v1/inventory/movements')
            ->assertOk()
            ->assertJsonPath('data.0.id', $transfer->public_id)
            ->assertJsonPath('data.0.from_location', null)
            ->assertJsonPath('data.0.to_location.id', $this->location->public_id);
    }

    #[Test]
    public function it_does_not_mask_a_foreign_end_for_a_bypass_role(): void
    {
        $foreign = $this->secondaryLocation();
        $transfer = $this->makeMovement([
            'from_location_id' => $foreign->id,
            'to_location_id' => $this->location->id,
            'reason' => StockMovement::REASON_TRANSFER,
        ]);

        $this->user->assignRole($this->bypassRole());

        $this->getJson("/api/v1/inventory/movements/{$transfer->public_id}")
            ->assertOk()
            ->assertJsonPath('data.from_location.id', $foreign->public_id)
            ->assertJsonPath('data.to_location.id', $this->location->public_id);
    }

    #[Test]
    public function it_lets_bypass_roles_see_movements_across_all_units(): void
    {
        $foreign = $this->secondaryLocation();
        for ($i = 0; $i < 3; $i++) {
            $this->makeMovement();
        }
        for ($i = 0; $i < 4; $i++) {
            $this->makeMovement(['to_location_id' => $foreign->id]);
        }

        $this->user->assignRole($this->bypassRole());

        $this->getJson('/api/v1/inventory/movements?per_page=100')
            ->assertOk()
            ->assertJsonPath('meta.total', 7);
    }

    // ----- response shape --------------------------------------------------

    #[Test]
    public function it_returns_public_ids_and_the_summary_shape_in_the_list(): void
    {
        $movement = $this->makeMovement([
            'reason' => StockMovement::REASON_TRANSFER,
            'from_location_id' => $this->location->id,
            'to_location_id' => $this->secondaryLocation()->id,
        ]);
        $this->user->assignRole($this->bypassRole());

        $this->getJson('/api/v1/inventory/movements')
            ->assertOk()
            ->assertJsonPath('data.0.id', $movement->public_id)
            ->assertJsonPath('data.0.reason', 'TRANSFER')
            ->assertJsonPath('data.0.status', 'POSTED')
            ->assertJsonPath('data.0.direction', 'transfer')
            ->assertJsonPath('data.0.is_reversal', false)
            ->assertJsonPath('data.0.quantity', 5)
            ->assertJsonPath('data.0.from_location.id', $this->location->public_id)
            ->assertJsonPath('data.0.variant.id', $this->variant->public_id)
            ->assertJsonMissingPath('data.0.notes');
    }

    #[Test]
    public function it_returns_full_evidence_in_the_detail(): void
    {
        $receipt = Receipt::create([
            'supplier_id' => $this->createSupplier()->id,
            'destination_location_id' => $this->location->id,
            'reference' => 'FAC-9001',
            'receipt_date' => '2026-08-20',
            'status' => Receipt::STATUS_POSTED,
            'posted_at' => now(),
            'posted_by_user_id' => $this->user->id,
            'created_by_user_id' => $this->user->id,
        ]);

        $movement = $this->makeMovement([
            'notes' => 'received short',
            'related_type' => Receipt::class,
            'related_id' => $receipt->id,
            'related_line_id' => 7,
        ]);

        $this->getJson("/api/v1/inventory/movements/{$movement->public_id}")
            ->assertOk()
            ->assertJsonPath('data.id', $movement->public_id)
            ->assertJsonPath('data.direction', 'entry')
            ->assertJsonPath('data.notes', 'received short')
            ->assertJsonPath('data.actor.id', $this->user->id)
            ->assertJsonPath('data.source.type', 'receipt')
            // Public ULID at the boundary — never the internal related_id / line key.
            ->assertJsonPath('data.source.id', $receipt->public_id)
            ->assertJsonMissingPath('data.source.line_id')
            ->assertJsonPath('data.variant.base_uom.code', 'KG')
            ->assertJsonPath('data.posted_at', $movement->posted_at->toIso8601String());
    }

    #[Test]
    public function it_nulls_the_source_id_when_the_origin_document_was_hard_deleted(): void
    {
        $movement = $this->makeMovement([
            'related_type' => Receipt::class,
            'related_id' => 999999,
        ]);

        $this->getJson("/api/v1/inventory/movements/{$movement->public_id}")
            ->assertOk()
            ->assertJsonPath('data.source.type', 'receipt')
            ->assertJsonPath('data.source.id', null);
    }

    #[Test]
    public function it_links_an_original_and_its_compensating_reversal_both_ways(): void
    {
        $original = $this->makeMovement([
            'reason' => StockMovement::REASON_PURCHASE_RECEIPT,
            'to_location_id' => $this->location->id,
            'from_location_id' => null,
        ]);

        $reversal = StockMovement::create([
            'from_location_id' => $this->location->id,
            'to_location_id' => null,
            'item_variant_id' => $this->variant->id,
            'user_id' => $this->user->id,
            'qty' => 5,
            'reason' => StockMovement::REASON_PURCHASE_RECEIPT_REVERSAL,
            'status' => StockMovement::STATUS_POSTED,
            'reverses_stock_movement_id' => $original->id,
            'posted_at' => now(),
        ]);

        $original->update(['status' => StockMovement::STATUS_REVERSED]);

        $this->getJson("/api/v1/inventory/movements/{$reversal->public_id}")
            ->assertOk()
            ->assertJsonPath('data.is_reversal', true)
            ->assertJsonPath('data.reverses.id', $original->public_id);

        $this->getJson("/api/v1/inventory/movements/{$original->public_id}")
            ->assertOk()
            ->assertJsonPath('data.status', 'REVERSED')
            ->assertJsonPath('data.reversed_by.id', $reversal->public_id);
    }

    #[Test]
    public function it_serializes_missing_optional_relations_safely(): void
    {
        $movement = $this->makeMovement([
            'user_id' => null,
            'related_type' => null,
            'related_id' => null,
            'related_line_id' => null,
            'reference' => null,
        ]);
        $this->location->delete();

        $this->getJson("/api/v1/inventory/movements/{$movement->public_id}")
            ->assertOk()
            ->assertJsonPath('data.id', $movement->public_id)
            ->assertJsonPath('data.actor', null)
            ->assertJsonPath('data.source', null)
            ->assertJsonPath('data.reference', null)
            ->assertJsonPath('data.to_location.id', $this->location->public_id);
    }

    // ----- no write side effects & N+1 ----------------------------------

    #[Test]
    public function it_does_not_write_stock_or_ledger_rows_on_a_read(): void
    {
        for ($i = 0; $i < 3; $i++) {
            $this->makeMovement();
        }

        $before = [
            'movements' => DB::table('stock_movements')->count(),
            'lines' => DB::table('stock_movement_lines')->count(),
            'stock' => DB::table('stock')->count(),
        ];

        $movement = StockMovement::query()->first();
        $this->getJson('/api/v1/inventory/movements')->assertOk();
        $this->getJson("/api/v1/inventory/movements/{$movement->public_id}")->assertOk();

        $this->assertSame($before, [
            'movements' => DB::table('stock_movements')->count(),
            'lines' => DB::table('stock_movement_lines')->count(),
            'stock' => DB::table('stock')->count(),
        ]);
    }

    #[Test]
    public function it_does_not_n_plus_one_when_listing(): void
    {
        // Warm-up request so the Spatie permission registrar is already cached
        // and only the movement-loading queries are measured below.
        $this->getJson('/api/v1/inventory/movements')->assertOk();

        $this->makeMovement();

        DB::enableQueryLog();
        DB::flushQueryLog();
        $this->getJson('/api/v1/inventory/movements')->assertOk();
        $small = count(DB::getQueryLog());
        DB::disableQueryLog();

        for ($i = 0; $i < 6; $i++) {
            $this->makeMovement([
                'item_variant_id' => $this->createItemVariant($this->createItem())->id,
            ]);
        }

        DB::enableQueryLog();
        DB::flushQueryLog();
        $this->getJson('/api/v1/inventory/movements')->assertOk();
        $large = count(DB::getQueryLog());
        DB::disableQueryLog();

        $this->assertSame($small, $large);
    }

    #[Test]
    public function it_returns_404_for_an_unknown_public_id(): void
    {
        $this->getJson('/api/v1/inventory/movements/01JZZZZZZZZZZZZZZZZZZZZZZZZ')->assertNotFound();
    }
}
