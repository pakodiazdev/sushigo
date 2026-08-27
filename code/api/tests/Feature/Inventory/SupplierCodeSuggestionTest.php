<?php

namespace Tests\Feature\Inventory;

use App\Models\Supplier;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Str;
use Laravel\Passport\Passport;
use PHPUnit\Framework\Attributes\Test;

class SupplierCodeSuggestionTest extends InventoryTestCase
{
    private const NEXT_CODE_URL = '/api/v1/inventory/suppliers/next-code';

    #[Test]
    public function it_suggests_the_first_code_when_no_suppliers_exist(): void
    {
        $this->getJson(self::NEXT_CODE_URL)
            ->assertOk()
            ->assertJsonPath('code', 'PROV-001')
            ->assertJsonPath('prefix', 'PROV-');
    }

    #[Test]
    public function it_suggests_the_next_sequential_code_after_existing_ones(): void
    {
        Supplier::create(['code' => 'PROV-001', 'name' => 'One']);
        Supplier::create(['code' => 'PROV-002', 'name' => 'Two']);

        $this->getJson(self::NEXT_CODE_URL)
            ->assertOk()
            ->assertJsonPath('code', 'PROV-003');
    }

    #[Test]
    public function it_ignores_codes_that_do_not_match_the_prefix_pattern(): void
    {
        Supplier::create(['code' => 'MANUAL', 'name' => 'Manual']);
        Supplier::create(['code' => 'PROV-ABC', 'name' => 'Non numeric suffix']);
        Supplier::create(['code' => 'OTHER-009', 'name' => 'Different prefix']);
        Supplier::create(['code' => 'PROV-007', 'name' => 'Seven']);

        $this->getJson(self::NEXT_CODE_URL)
            ->assertOk()
            ->assertJsonPath('code', 'PROV-008');
    }

    #[Test]
    public function it_does_not_backfill_gaps_in_the_sequence(): void
    {
        Supplier::create(['code' => 'PROV-001', 'name' => 'One']);
        Supplier::create(['code' => 'PROV-005', 'name' => 'Five']);

        $this->getJson(self::NEXT_CODE_URL)
            ->assertOk()
            ->assertJsonPath('code', 'PROV-006');
    }

    #[Test]
    public function it_handles_numeric_suffixes_larger_than_the_padding_width(): void
    {
        Supplier::create(['code' => 'PROV-1200', 'name' => 'Big']);

        $this->getJson(self::NEXT_CODE_URL)
            ->assertOk()
            ->assertJsonPath('code', 'PROV-1201');
    }

    #[Test]
    public function it_ignores_a_numeric_suffix_too_large_to_be_a_real_sequence_entry(): void
    {
        // 17 digits — far past int4/int8; must be skipped, not crash the aggregate.
        Supplier::create(['code' => 'PROV-12345678901234567', 'name' => 'Absurd']);
        Supplier::create(['code' => 'PROV-003', 'name' => 'Three']);

        $this->getJson(self::NEXT_CODE_URL)
            ->assertOk()
            ->assertJsonPath('code', 'PROV-004');
    }

    #[Test]
    public function it_treats_soft_deleted_supplier_codes_as_occupied(): void
    {
        Supplier::create(['code' => 'PROV-001', 'name' => 'One']);
        $deleted = Supplier::create(['code' => 'PROV-002', 'name' => 'Two']);
        $deleted->delete();

        $this->getJson(self::NEXT_CODE_URL)
            ->assertOk()
            ->assertJsonPath('code', 'PROV-003');
    }

    #[Test]
    public function it_requires_the_suppliers_manage_permission(): void
    {
        $this->user->removeRole('inventory-manager');
        $this->user->givePermissionTo('suppliers.view');

        $this->getJson(self::NEXT_CODE_URL)->assertForbidden();
    }

    #[Test]
    public function it_requires_authentication_for_the_suggestion_endpoint(): void
    {
        Passport::actingAs($this->user);
        auth()->forgetGuards();

        $this->getJson(self::NEXT_CODE_URL)->assertUnauthorized();
    }

    #[Test]
    public function it_returns_a_regenerated_suggestion_when_the_code_races_on_create(): void
    {
        Supplier::create(['code' => 'PROV-013', 'name' => 'Thirteen']);

        // A truly independent connection (its own PDO, autocommit) so the row it writes
        // is really committed and survives the request's own savepoint rollback — exactly
        // what a concurrent HTTP request would do.
        Config::set('database.connections.race', Config::get('database.connections.'.Config::get('database.default')));
        $race = DB::connection('race');

        // Claim PROV-014 only after this request has passed the Rule::unique pre-check
        // (i.e. once the model is about to be saved) but before its own insert commits.
        $raced = false;
        Event::listen('eloquent.saving: '.Supplier::class, function (Supplier $supplier) use (&$raced, $race): void {
            if ($raced || $supplier->name !== 'Loser') {
                return;
            }
            $raced = true;
            $race->table('suppliers')->insert([
                'public_id' => (string) Str::ulid(),
                'code' => 'PROV-014',
                'name' => 'Raced In',
                'is_active' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        });

        try {
            $this->postJson('/api/v1/inventory/suppliers', [
                'code' => 'PROV-014',
                'name' => 'Loser',
            ])
                ->assertUnprocessable()
                ->assertJsonValidationErrors(['code'])
                ->assertJsonPath('rejected_code', 'PROV-014')
                ->assertJsonPath('suggested_code', 'PROV-015');

            $this->assertDatabaseMissing('suppliers', ['name' => 'Loser']);
        } finally {
            $race->table('suppliers')->where('code', 'PROV-014')->delete();
            $race->disconnect();
        }
    }

    #[Test]
    public function it_still_rejects_a_plain_duplicate_code_even_without_calling_the_suggestion_endpoint(): void
    {
        Supplier::create(['code' => 'PROV-001', 'name' => 'One']);

        $this->postJson('/api/v1/inventory/suppliers', [
            'code' => 'PROV-001',
            'name' => 'Duplicate',
        ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['code']);
    }
}
