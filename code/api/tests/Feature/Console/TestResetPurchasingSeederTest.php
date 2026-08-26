<?php

namespace Tests\Feature\Console;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class TestResetPurchasingSeederTest extends TestCase
{
    use RefreshDatabase;

    #[Test]
    public function list_option_shows_purchasing_and_fakes_purchasing_groups(): void
    {
        $this->artisan('test:reset', ['--list' => true])
            ->expectsOutputToContain('fakes-purchasing')
            ->expectsOutputToContain('purchasing')
            ->expectsOutputToContain('PurchasingTestSeeder')
            ->expectsOutputToContain('FakeSuppliersSeeder')
            ->assertExitCode(0);
    }

    #[Test]
    public function purchasing_group_seeds_two_suppliers_quoting_the_same_presentation(): void
    {
        $this->artisan('test:reset', ['--seeders' => 'purchasing'])
            ->expectsOutputToContain('PurchasingTestSeeder')
            ->assertExitCode(0);

        $this->assertSame(2, DB::table('suppliers')->count());
        $this->assertSame(2, DB::table('supplier_offerings')->count());
    }

    #[Test]
    public function purchasing_group_posts_a_receipt_with_bonus_packages_and_freight(): void
    {
        $this->artisan('test:reset', ['--seeders' => 'purchasing'])->assertExitCode(0);

        $this->assertDatabaseHas('receipts', ['reference' => 'FAC-TEST-PURCH-001', 'status' => 'POSTED']);

        $line = DB::table('receipt_lines')->first();
        $this->assertEquals(240.0, (float) $line->base_units_received);
    }

    #[Test]
    public function purchasing_group_seeds_a_branch_context_price_difference_and_a_promotion(): void
    {
        $this->artisan('test:reset', ['--seeders' => 'purchasing'])->assertExitCode(0);

        $this->assertSame(3, DB::table('price_lists')->count());
        $this->assertSame(3, DB::table('price_list_assignments')->count());

        $this->assertDatabaseHas('price_list_assignments', ['operating_unit_id' => null]);
        $eventAssignmentExists = DB::table('price_list_assignments')->whereNotNull('operating_unit_id')->exists();
        $this->assertTrue($eventAssignmentExists, 'A branch-context (event Operating Unit) assignment must be seeded');
    }

    #[Test]
    public function fakes_purchasing_group_creates_volume_data_for_pagination_testing(): void
    {
        $this->artisan('test:reset', ['--seeders' => 'fakes-purchasing'])
            ->expectsOutputToContain('FakeSuppliersSeeder')
            ->assertExitCode(0);

        $supplierCount = config('seeders.factory_counts.fake_suppliers', 15);

        // fakes-purchasing runs PurchasingTestSeeder first (2 deterministic suppliers)
        // then FakeSuppliersSeeder adds $supplierCount more via factories.
        $this->assertSame(2 + $supplierCount, DB::table('suppliers')->count());
    }
}
