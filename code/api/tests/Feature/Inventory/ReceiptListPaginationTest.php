<?php

namespace Tests\Feature\Inventory;

use App\Models\InventoryLocation;
use App\Models\OperatingUnit;
use App\Models\Receipt;
use App\Models\ReceiptLine;
use App\Models\Supplier;
use Illuminate\Support\Facades\DB;
use PHPUnit\Framework\Attributes\Test;
use Spatie\Permission\Models\Role;

class ReceiptListPaginationTest extends InventoryTestCase
{
    private Supplier $listSupplier;

    private int $receiptSeq = 0;

    protected function setUp(): void
    {
        parent::setUp();

        $this->listSupplier = $this->createSupplier(['code' => 'SUP-LIST', 'name' => 'List Supplier']);
    }

    private function makeReceipt(array $overrides = []): Receipt
    {
        $this->receiptSeq++;

        return Receipt::create(array_merge([
            'supplier_id' => $this->listSupplier->id,
            'destination_location_id' => $this->location->id,
            'reference' => 'FAC-'.str_pad((string) $this->receiptSeq, 4, '0', STR_PAD_LEFT),
            'receipt_date' => '2026-08-'.str_pad((string) min(28, $this->receiptSeq), 2, '0', STR_PAD_LEFT),
            'status' => Receipt::STATUS_DRAFT,
            'created_by_user_id' => $this->user->id,
        ], $overrides));
    }

    private function makeLine(Receipt $receipt, float $netAmount): ReceiptLine
    {
        $item = $this->createItem();
        $variant = $this->createItemVariant($item);
        $template = $this->createPurchasePresentationTemplate();
        $presentation = $this->createVariantPurchasePresentation($variant, $template);

        return ReceiptLine::create([
            'receipt_id' => $receipt->id,
            'variant_purchase_presentation_id' => $presentation->id,
            'received_packages' => 10,
            'presentation_factor' => 24,
            'gross_amount' => $netAmount,
            'net_acquisition_amount' => $netAmount,
            'base_units_received' => 240,
            'effective_unit_cost' => $netAmount / 240,
        ]);
    }

    private function secondaryLocation(): InventoryLocation
    {
        $unit = OperatingUnit::create([
            'branch_id' => $this->branch->id,
            'type' => 'BRANCH_MAIN',
            'name' => 'Second Inventory',
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

    #[Test]
    public function it_bounds_the_default_page_size(): void
    {
        for ($i = 0; $i < 20; $i++) {
            $this->makeReceipt();
        }

        $this->getJson('/api/v1/inventory/receipts')
            ->assertOk()
            ->assertJsonCount(15, 'data')
            ->assertJsonPath('meta.per_page', 15)
            ->assertJsonPath('meta.total', 20)
            ->assertJsonPath('meta.current_page', 1)
            ->assertJsonPath('meta.last_page', 2);
    }

    #[Test]
    public function it_rejects_per_page_above_the_documented_maximum(): void
    {
        $this->makeReceipt();

        $this->getJson('/api/v1/inventory/receipts?per_page=101')
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['per_page']);

        $this->getJson('/api/v1/inventory/receipts?per_page=100')->assertOk();
    }

    #[Test]
    public function it_paginates_without_duplicating_or_dropping_rows(): void
    {
        $expected = [];
        for ($i = 0; $i < 25; $i++) {
            $expected[] = $this->makeReceipt()->public_id;
        }

        $seen = [];
        foreach ([1, 2, 3] as $page) {
            $ids = $this->getJson("/api/v1/inventory/receipts?per_page=10&page={$page}")
                ->assertOk()
                ->json('data.*.id');
            $seen = array_merge($seen, $ids);
        }

        $this->assertCount(25, $seen);
        $this->assertCount(25, array_unique($seen));
        sort($expected);
        $sortedSeen = $seen;
        sort($sortedSeen);
        $this->assertSame($expected, $sortedSeen);
    }

    #[Test]
    public function it_orders_same_date_receipts_deterministically_by_id_desc(): void
    {
        $first = $this->makeReceipt(['receipt_date' => '2026-08-10']);
        $second = $this->makeReceipt(['receipt_date' => '2026-08-10']);
        $third = $this->makeReceipt(['receipt_date' => '2026-08-10']);

        $this->getJson('/api/v1/inventory/receipts')
            ->assertOk()
            ->assertJsonPath('data.0.id', $third->public_id)
            ->assertJsonPath('data.1.id', $second->public_id)
            ->assertJsonPath('data.2.id', $first->public_id);
    }

    #[Test]
    public function it_composes_status_filter_with_pagination(): void
    {
        for ($i = 0; $i < 12; $i++) {
            $this->makeReceipt(['status' => Receipt::STATUS_POSTED]);
        }
        for ($i = 0; $i < 8; $i++) {
            $this->makeReceipt(['status' => Receipt::STATUS_DRAFT]);
        }

        $this->getJson('/api/v1/inventory/receipts?status=POSTED&per_page=10')
            ->assertOk()
            ->assertJsonCount(10, 'data')
            ->assertJsonPath('meta.total', 12)
            ->assertJsonPath('meta.last_page', 2);
    }

    #[Test]
    public function it_filters_by_receipt_date_range(): void
    {
        $this->makeReceipt(['receipt_date' => '2026-08-05']);
        $inRangeA = $this->makeReceipt(['receipt_date' => '2026-08-10']);
        $inRangeB = $this->makeReceipt(['receipt_date' => '2026-08-12']);
        $this->makeReceipt(['receipt_date' => '2026-08-20']);

        $response = $this->getJson('/api/v1/inventory/receipts?date_from=2026-08-10&date_to=2026-08-12')
            ->assertOk()
            ->assertJsonPath('meta.total', 2);

        $ids = $response->json('data.*.id');
        sort($ids);
        $expected = [$inRangeA->public_id, $inRangeB->public_id];
        sort($expected);
        $this->assertSame($expected, $ids);
    }

    #[Test]
    public function it_accepts_date_to_without_date_from(): void
    {
        $this->makeReceipt(['receipt_date' => '2026-08-05']);
        $this->makeReceipt(['receipt_date' => '2026-08-12']);
        $this->makeReceipt(['receipt_date' => '2026-08-20']);

        $this->getJson('/api/v1/inventory/receipts?date_to=2026-08-12')
            ->assertOk()
            ->assertJsonPath('meta.total', 2);
    }

    #[Test]
    public function it_accepts_date_from_without_date_to(): void
    {
        $this->makeReceipt(['receipt_date' => '2026-08-05']);
        $this->makeReceipt(['receipt_date' => '2026-08-12']);
        $this->makeReceipt(['receipt_date' => '2026-08-20']);

        $this->getJson('/api/v1/inventory/receipts?date_from=2026-08-12')
            ->assertOk()
            ->assertJsonPath('meta.total', 2);
    }

    #[Test]
    public function it_still_rejects_date_to_before_date_from_when_both_are_present(): void
    {
        $this->getJson('/api/v1/inventory/receipts?date_from=2026-08-20&date_to=2026-08-10')
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['date_to']);
    }

    #[Test]
    public function it_filters_by_destination_location(): void
    {
        $other = $this->secondaryLocation();

        for ($i = 0; $i < 3; $i++) {
            $this->makeReceipt();
        }
        for ($i = 0; $i < 4; $i++) {
            $this->makeReceipt(['destination_location_id' => $other->id]);
        }

        $this->user->assignRole($this->bypassRole());

        $this->getJson('/api/v1/inventory/receipts?destination_location_id='.$other->public_id)
            ->assertOk()
            ->assertJsonPath('meta.total', 4);
    }

    #[Test]
    public function it_rejects_a_soft_deleted_destination_location_filter(): void
    {
        $other = $this->secondaryLocation();
        $other->delete();

        $this->user->assignRole($this->bypassRole());

        $this->getJson('/api/v1/inventory/receipts?destination_location_id='.$other->public_id)
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['destination_location_id']);
    }

    #[Test]
    public function it_rejects_an_inaccessible_destination_location_filter_like_a_nonexistent_one(): void
    {
        // A real location in an Operating Unit the caller cannot access must fail
        // validation exactly like a made-up ULID (422) — a 422-vs-empty-page
        // difference would reveal which out-of-scope location ULIDs exist.
        $inaccessible = $this->secondaryLocation();

        $this->getJson('/api/v1/inventory/receipts?destination_location_id='.$inaccessible->public_id)
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['destination_location_id']);

        $this->getJson('/api/v1/inventory/receipts?destination_location_id=01JAAAAAAAAAAAAAAAAAAAAAAA')
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['destination_location_id']);
    }

    #[Test]
    public function it_allows_filtering_by_an_accessible_destination_location_for_a_scoped_caller(): void
    {
        for ($i = 0; $i < 3; $i++) {
            $this->makeReceipt();
        }

        $this->getJson('/api/v1/inventory/receipts?destination_location_id='.$this->location->public_id)
            ->assertOk()
            ->assertJsonPath('meta.total', 3);
    }

    #[Test]
    public function it_filters_by_reference_search(): void
    {
        $this->makeReceipt(['reference' => 'INV-2026-777']);
        $this->makeReceipt(['reference' => 'INV-2026-778']);
        $this->makeReceipt(['reference' => 'OTHER-001']);

        $this->getJson('/api/v1/inventory/receipts?search=2026-777')
            ->assertOk()
            ->assertJsonPath('meta.total', 1)
            ->assertJsonPath('data.0.reference', 'INV-2026-777');
    }

    #[Test]
    public function it_treats_like_wildcards_in_the_search_term_as_literal_characters(): void
    {
        $this->makeReceipt(['reference' => 'AB%CD']);
        $this->makeReceipt(['reference' => 'ABZCD']);
        $this->makeReceipt(['reference' => 'A_B']);
        $this->makeReceipt(['reference' => 'AXB']);

        // Unescaped, "%" between B and C would match ABZCD too.
        $this->getJson('/api/v1/inventory/receipts?search='.urlencode('B%C'))
            ->assertOk()
            ->assertJsonPath('meta.total', 1)
            ->assertJsonPath('data.0.reference', 'AB%CD');

        // Unescaped, "_" would match any single character (AXB).
        $this->getJson('/api/v1/inventory/receipts?search='.urlencode('A_B'))
            ->assertOk()
            ->assertJsonPath('meta.total', 1)
            ->assertJsonPath('data.0.reference', 'A_B');
    }

    #[Test]
    public function it_scopes_receipts_to_the_users_operating_units_before_counting(): void
    {
        $inaccessible = $this->secondaryLocation();

        for ($i = 0; $i < 5; $i++) {
            $this->makeReceipt();
        }
        for ($i = 0; $i < 7; $i++) {
            $this->makeReceipt(['destination_location_id' => $inaccessible->id]);
        }

        $response = $this->getJson('/api/v1/inventory/receipts?per_page=100')
            ->assertOk()
            ->assertJsonPath('meta.total', 5)
            ->assertJsonCount(5, 'data');

        foreach ($response->json('data') as $row) {
            $this->assertSame($this->location->public_id, $row['destination_location']['id']);
        }
    }

    #[Test]
    public function it_lets_bypass_roles_see_receipts_across_all_operating_units(): void
    {
        $other = $this->secondaryLocation();

        for ($i = 0; $i < 5; $i++) {
            $this->makeReceipt();
        }
        for ($i = 0; $i < 7; $i++) {
            $this->makeReceipt(['destination_location_id' => $other->id]);
        }

        $this->user->assignRole($this->bypassRole());

        $this->getJson('/api/v1/inventory/receipts?per_page=100')
            ->assertOk()
            ->assertJsonPath('meta.total', 12)
            ->assertJsonCount(12, 'data');
    }

    #[Test]
    public function it_does_not_n_plus_one_when_listing(): void
    {
        $this->getJson('/api/v1/inventory/receipts')->assertOk();

        $this->makeLine($this->makeReceipt(), 4950);

        DB::enableQueryLog();
        DB::flushQueryLog();
        $this->getJson('/api/v1/inventory/receipts')->assertOk();
        $small = count(DB::getQueryLog());
        DB::disableQueryLog();

        for ($i = 0; $i < 5; $i++) {
            $receipt = $this->makeReceipt();
            $this->makeLine($receipt, 1000);
            $this->makeLine($receipt, 2000);
        }

        DB::enableQueryLog();
        DB::flushQueryLog();
        $this->getJson('/api/v1/inventory/receipts')->assertOk();
        $large = count(DB::getQueryLog());
        DB::disableQueryLog();

        $this->assertSame($small, $large);
    }

    #[Test]
    public function it_returns_a_line_total_but_omits_line_evidence_from_the_list(): void
    {
        $receipt = $this->makeReceipt();
        $this->makeLine($receipt, 3000);
        $this->makeLine($receipt, 1500);

        $this->getJson('/api/v1/inventory/receipts')
            ->assertOk()
            ->assertJsonPath('data.0.id', $receipt->public_id)
            ->assertJsonPath('data.0.total', 4500)
            ->assertJsonMissingPath('data.0.lines');
    }

    #[Test]
    public function it_keeps_full_line_evidence_available_through_the_detail_endpoint(): void
    {
        $receipt = $this->makeReceipt();
        $this->makeLine($receipt, 3000);

        $this->getJson("/api/v1/inventory/receipts/{$receipt->public_id}")
            ->assertOk()
            ->assertJsonCount(1, 'data.lines');
    }

    private function bypassRole(): string
    {
        Role::firstOrCreate(['name' => 'admin', 'guard_name' => 'api']);

        return 'admin';
    }
}
