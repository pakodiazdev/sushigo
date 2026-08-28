<?php

namespace Tests\Feature\CashAdjustments\CashRegisters;

use App\Models\Branch;
use App\Models\CashRegister;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Str;
use PHPUnit\Framework\Attributes\Test;
use Tests\Feature\CashAdjustments\Concerns\SetsUpBranchAccess;
use Tests\TestCase;

/**
 * #498 — the Cash Register creation form receives the next globally available
 * REG-NNN code, and a create-time unique-code race is surfaced as a stable
 * field-error contract with a fresh suggestion instead of a silent retry.
 */
class CashRegisterCodeSuggestionTest extends TestCase
{
    use RefreshDatabase;
    use SetsUpBranchAccess;

    private const NEXT_CODE_URL = '/api/v1/cash-registers/next-code';

    #[Test]
    public function it_suggests_the_first_code_when_no_registers_exist(): void
    {
        $this->actingAsUserWithoutBranchAccess('cash_registers.create');

        $this->getJson(self::NEXT_CODE_URL)
            ->assertOk()
            ->assertJsonPath('code', 'REG-001')
            ->assertJsonPath('prefix', 'REG-');
    }

    #[Test]
    public function it_suggests_the_next_sequential_code_after_existing_ones(): void
    {
        $branch = Branch::factory()->create();
        CashRegister::factory()->for($branch)->create(['code' => 'REG-001']);
        CashRegister::factory()->for($branch)->create(['code' => 'REG-002']);
        $this->actingAsUserWithoutBranchAccess('cash_registers.create');

        $this->getJson(self::NEXT_CODE_URL)
            ->assertOk()
            ->assertJsonPath('code', 'REG-003');
    }

    #[Test]
    public function it_ignores_codes_that_do_not_match_the_prefix_pattern(): void
    {
        $branch = Branch::factory()->create();
        CashRegister::factory()->for($branch)->create(['code' => 'MANUAL']);
        CashRegister::factory()->for($branch)->create(['code' => 'REG-ABC']);
        CashRegister::factory()->for($branch)->create(['code' => 'OTHER-009']);
        CashRegister::factory()->for($branch)->create(['code' => 'REG-007']);
        $this->actingAsUserWithoutBranchAccess('cash_registers.create');

        $this->getJson(self::NEXT_CODE_URL)
            ->assertOk()
            ->assertJsonPath('code', 'REG-008');
    }

    #[Test]
    public function it_does_not_backfill_gaps_in_the_sequence(): void
    {
        $branch = Branch::factory()->create();
        CashRegister::factory()->for($branch)->create(['code' => 'REG-001']);
        CashRegister::factory()->for($branch)->create(['code' => 'REG-005']);
        $this->actingAsUserWithoutBranchAccess('cash_registers.create');

        $this->getJson(self::NEXT_CODE_URL)
            ->assertOk()
            ->assertJsonPath('code', 'REG-006');
    }

    #[Test]
    public function it_handles_numeric_suffixes_larger_than_the_padding_width(): void
    {
        $branch = Branch::factory()->create();
        CashRegister::factory()->for($branch)->create(['code' => 'REG-1200']);
        $this->actingAsUserWithoutBranchAccess('cash_registers.create');

        $this->getJson(self::NEXT_CODE_URL)
            ->assertOk()
            ->assertJsonPath('code', 'REG-1201');
    }

    #[Test]
    public function it_ignores_a_numeric_suffix_too_large_to_be_a_real_sequence_entry(): void
    {
        $branch = Branch::factory()->create();
        // 17 digits — far past int4/int8; must be skipped, not crash the aggregate.
        CashRegister::factory()->for($branch)->create(['code' => 'REG-12345678901234567']);
        CashRegister::factory()->for($branch)->create(['code' => 'REG-003']);
        $this->actingAsUserWithoutBranchAccess('cash_registers.create');

        $this->getJson(self::NEXT_CODE_URL)
            ->assertOk()
            ->assertJsonPath('code', 'REG-004');
    }

    #[Test]
    public function it_does_not_reset_the_sequence_per_branch_operating_unit_or_type(): void
    {
        $branchA = Branch::factory()->create();
        $branchB = Branch::factory()->create();
        CashRegister::factory()->for($branchA)->create(['code' => 'REG-001', 'type' => CashRegister::TYPE_ON_PREMISE]);
        CashRegister::factory()->for($branchB)->create(['code' => 'REG-002', 'type' => CashRegister::TYPE_EVENT]);
        $this->actingAsUserWithoutBranchAccess('cash_registers.create');

        $this->getJson(self::NEXT_CODE_URL)
            ->assertOk()
            ->assertJsonPath('code', 'REG-003');
    }

    #[Test]
    public function it_requires_the_cash_registers_create_permission(): void
    {
        $this->actingAsUserWithoutBranchAccess('some.other.permission');

        $this->getJson(self::NEXT_CODE_URL)->assertForbidden();
    }

    #[Test]
    public function it_requires_authentication_for_the_suggestion_endpoint(): void
    {
        $this->getJson(self::NEXT_CODE_URL)->assertUnauthorized();
    }

    #[Test]
    public function it_returns_a_regenerated_suggestion_when_the_code_races_on_create(): void
    {
        $this->actingAsUserWithoutBranchAccess('cash_registers.create');

        // A truly independent connection (its own PDO, autocommit) so the rows it
        // writes are really committed and survive the request's own savepoint
        // rollback — exactly what a concurrent HTTP request would do. The branch
        // and the REG-013 row are seeded here (not via factories) for the same
        // reason: the request's `branch_id` check and the raced insert's FK both
        // need them visible outside the test transaction.
        Config::set('database.connections.race', Config::get('database.connections.'.Config::get('database.default')));
        $race = DB::connection('race');

        $branchId = $race->table('branches')->insertGetId([
            'code' => 'BR-RACE',
            'name' => 'Race Branch',
            'timezone' => 'UTC',
            'is_active' => true,
            'created_at' => now(),
            'updated_at' => now(),
        ]);
        $race->table('cash_registers')->insert([
            'public_id' => (string) Str::ulid(),
            'branch_id' => $branchId,
            'code' => 'REG-013',
            'name' => 'Caja Trece',
            'type' => CashRegister::TYPE_ON_PREMISE,
            'is_active' => true,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        // Claim REG-014 only after this request has passed the FormRequest's
        // `unique` pre-check (i.e. once the model is about to be saved) but
        // before its own insert commits.
        $raced = false;
        Event::listen('eloquent.saving: '.CashRegister::class, function (CashRegister $register) use (&$raced, $race, $branchId): void {
            if ($raced || $register->name !== 'Caja Perdedora') {
                return;
            }
            $raced = true;
            $race->table('cash_registers')->insert([
                'public_id' => (string) Str::ulid(),
                'branch_id' => $branchId,
                'code' => 'REG-014',
                'name' => 'Raced In',
                'type' => CashRegister::TYPE_ON_PREMISE,
                'is_active' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        });

        try {
            $this->postJson('/api/v1/cash-registers', [
                'branch_id' => $branchId,
                'code' => 'REG-014',
                'name' => 'Caja Perdedora',
                'type' => CashRegister::TYPE_ON_PREMISE,
            ])
                ->assertUnprocessable()
                ->assertJsonValidationErrors(['code'])
                ->assertJsonPath('rejected_code', 'REG-014')
                ->assertJsonPath('suggested_code', 'REG-015');

            $this->assertDatabaseMissing('cash_registers', ['name' => 'Caja Perdedora']);
        } finally {
            $race->table('cash_registers')->whereIn('code', ['REG-013', 'REG-014'])->delete();
            $race->table('branches')->where('id', $branchId)->delete();
            $race->disconnect();
        }
    }

    #[Test]
    public function it_still_rejects_a_plain_duplicate_code_without_calling_the_suggestion_endpoint(): void
    {
        $branch = Branch::factory()->create();
        CashRegister::factory()->for($branch)->create(['code' => 'REG-001']);
        $this->actingAsUserWithBranchAccess($branch, 'cash_registers.create');

        $this->postJson('/api/v1/cash-registers', [
            'branch_id' => $branch->id,
            'code' => 'REG-001',
            'name' => 'Caja Duplicada',
            'type' => CashRegister::TYPE_ON_PREMISE,
        ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['code']);
    }
}
